package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"

	"github.com/synqronlabs/mxraven-go/mail/webhook"
)

// runWebhook serves POST /webhook, verifies incoming signatures, decodes the
// payload, and logs a summary for each event.
func runWebhook(args []string) error {
	secret, err := Require("MXRAVEN_WEBHOOK_SECRET")
	if err != nil {
		return err
	}
	verifier, err := webhook.NewVerifier(webhook.WithSecret(secret))
	if err != nil {
		return err
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/webhook", func(w http.ResponseWriter, r *http.Request) {
		// The signature covers the request host, but server requests carry an
		// empty r.URL.Host. Restore it from the proxy or Host header first.
		host := r.Header.Get("X-Forwarded-Host")
		if host == "" {
			host = r.Host
		}
		r.URL.Host = host

		event, err := verifier.VerifyAndDecode(r)
		if err != nil {
			if errors.Is(err, webhook.ErrInvalidSignature) {
				http.Error(w, "invalid signature", http.StatusUnauthorized)
				return
			}
			http.Error(w, "invalid webhook: "+err.Error(), http.StatusBadRequest)
			return
		}

		switch {
		case event.InboundEmail != nil:
			inbound := event.InboundEmail
			log.Printf("[inbound_email] task=%s subject=%q from=%v",
				inbound.TaskID, inbound.Message.Subject, inbound.Message.From)
			// Do not log RawEmail.AccessToken. The Go SDK ships no MIME
			// parser, so fetch the raw bytes and hand them to your own parser.
			raw, err := inbound.RawEmail.Fetch(r.Context(), nil)
			if err != nil {
				log.Printf("[inbound_email] fetch raw email: %v", err)
			} else {
				log.Printf("[inbound_email] raw email bytes=%d", len(raw))
			}
		case event.DeliveryStatus != nil:
			status := event.DeliveryStatus
			log.Printf("[delivery_status] task=%s status=%s smtp_code=%d enhanced_status_code=%s",
				status.TaskID, status.Status, status.SMTPCode, status.EnhancedStatusCode)
		case event.StorageStatus != nil:
			storage := event.StorageStatus
			log.Printf("[s3_egress_status] task=%s status=%s bucket=%s object=%s",
				storage.TaskID, storage.Status, storage.BucketName, storage.ObjectKey)
		default:
			log.Printf("[webhook] unhandled event type=%s", event.Type)
		}
		w.WriteHeader(http.StatusNoContent)
	})

	port := Port("WEBHOOK_PORT", 3000)
	addr := fmt.Sprintf(":%d", port)
	log.Printf("mxRaven webhook server listening on %s (path /webhook)", addr)
	return http.ListenAndServe(addr, mux)
}
