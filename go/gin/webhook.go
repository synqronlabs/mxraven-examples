package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/synqronlabs/mxraven-go/mail/webhook"
)

// handleWebhook verifies and decodes an mxRaven webhook delivery, then records
// a summary in the in-memory event log.
func handleWebhook(c *gin.Context) {
	secret := Get("MXRAVEN_WEBHOOK_SECRET")
	if secret == "" {
		fail(c, http.StatusInternalServerError, "MXRAVEN_WEBHOOK_SECRET is not set")
		return
	}

	verifier, err := webhook.NewVerifier(webhook.WithSecret(secret))
	if err != nil {
		fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	// The signature covers the host. Direct server requests leave
	// r.URL.Host empty, so restore the public host from the forwarded header
	// before verifying.
	host := c.Request.Header.Get("X-Forwarded-Host")
	if host == "" {
		host = c.Request.Host
	}
	c.Request.URL.Host = host

	event, err := verifier.VerifyAndDecode(c.Request)
	if err != nil {
		if errors.Is(err, webhook.ErrInvalidSignature) {
			fail(c, http.StatusUnauthorized, "invalid webhook signature")
			return
		}
		fail(c, http.StatusBadRequest, err.Error())
		return
	}

	switch {
	case event.InboundEmail != nil:
		inbound := event.InboundEmail
		raw, fetchErr := inbound.RawEmail.Fetch(c.Request.Context(), nil)
		if fetchErr != nil {
			fail(c, http.StatusBadRequest, "could not fetch raw email: "+fetchErr.Error())
			return
		}
		log.Printf("[inbound_email] task=%s subject=%s bytes=%d", inbound.TaskID, inbound.Message.Subject, len(raw))
		events.Record("inbound_email", fmt.Sprintf("task=%s subject=%q bytes=%d", inbound.TaskID, inbound.Message.Subject, len(raw)))

	case event.DeliveryStatus != nil:
		status := event.DeliveryStatus
		log.Printf("[delivery_status] task=%s status=%s smtpCode=%d enhancedStatus=%s", status.TaskID, status.Status, status.SMTPCode, status.EnhancedStatusCode)
		events.Record("delivery_status", fmt.Sprintf("task=%s status=%s smtpCode=%d enhancedStatus=%s", status.TaskID, status.Status, status.SMTPCode, status.EnhancedStatusCode))

	case event.StorageStatus != nil:
		status := event.StorageStatus
		log.Printf("[storage_status] task=%s status=%s bucket=%s object=%s", status.TaskID, status.Status, status.BucketName, status.ObjectKey)
		events.Record("storage_status", fmt.Sprintf("task=%s status=%s bucket=%s object=%s", status.TaskID, status.Status, status.BucketName, status.ObjectKey))

	default:
		events.Record("unknown", "webhook with no recognized payload")
	}

	c.Status(http.StatusNoContent)
}

// handleWebhookEvents returns the bounded in-memory webhook event log.
func handleWebhookEvents(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"events": events.Recent()})
}
