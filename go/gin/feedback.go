package main

import (
	"bytes"
	"encoding/base64"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/synqronlabs/mxraven-go/mail/feedback"
)

type feedbackLearnRequest struct {
	Label         string `json:"label"`
	RawMimeBase64 string `json:"rawMimeBase64"`
}

// handleFeedbackLearn submits one training example to the spam filter. The
// bytes must be the exact raw MIME that mxRaven processed so the service can
// match them by hash.
func handleFeedbackLearn(c *gin.Context) {
	var req feedbackLearnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		fail(c, http.StatusBadRequest, "invalid JSON body")
		return
	}

	raw, err := base64.StdEncoding.DecodeString(strings.TrimSpace(req.RawMimeBase64))
	if err != nil || len(raw) == 0 {
		failMail(c, invalid("rawMimeBase64 must be base64-encoded raw MIME bytes"))
		return
	}

	client, err := newFeedbackClient()
	if err != nil {
		failMail(c, err)
		return
	}

	var result *feedback.LearningResult
	switch strings.ToLower(strings.TrimSpace(req.Label)) {
	case "spam":
		result, err = client.LearnSpam(c.Request.Context(), bytes.NewReader(raw))
	case "ham":
		result, err = client.LearnHam(c.Request.Context(), bytes.NewReader(raw))
	default:
		failMail(c, invalid("label must be \"spam\" or \"ham\""))
		return
	}
	if err != nil {
		failMail(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":          result.Status,
		"disposition":     result.Disposition,
		"tenantId":        result.TenantID,
		"matchedHashKind": result.MatchedHashKind,
	})
}

type feedbackUnsubscribeRequest struct {
	Token string `json:"token"`
}

// handleFeedbackUnsubscribe performs an RFC 8058 one-click unsubscribe.
func handleFeedbackUnsubscribe(c *gin.Context) {
	var req feedbackUnsubscribeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		fail(c, http.StatusBadRequest, "invalid JSON body")
		return
	}

	token := strings.TrimSpace(req.Token)
	if token == "" {
		failMail(c, invalid("token is required"))
		return
	}

	client, err := newFeedbackClient()
	if err != nil {
		failMail(c, err)
		return
	}
	if err := client.Unsubscribe(c.Request.Context(), token); err != nil {
		failMail(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// newFeedbackClient builds a feedback client from environment configuration.
func newFeedbackClient() (*feedback.Client, error) {
	baseURL := Get("MXRAVEN_FEEDBACK_BASE_URL")
	if baseURL == "" {
		baseURL = "https://feedback.mxraven.com"
	}
	username, err := Require("MXRAVEN_USERNAME")
	if err != nil {
		return nil, err
	}
	secret, err := Require("MXRAVEN_SECRET")
	if err != nil {
		return nil, err
	}
	return feedback.New(
		feedback.WithBaseURL(baseURL),
		feedback.WithCredentials(username, secret),
	)
}
