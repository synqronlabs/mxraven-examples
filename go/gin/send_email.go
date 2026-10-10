package main

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/synqronlabs/mxraven-go/mail"
)

type sendEmailRequest struct {
	To      string `json:"to"`
	Subject string `json:"subject"`
	Text    string `json:"text"`
	HTML    string `json:"html"`
}

// handleSendEmail sends a plain text body with an optional HTML alternative.
func handleSendEmail(c *gin.Context) {
	var req sendEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		fail(c, http.StatusBadRequest, "invalid JSON body")
		return
	}

	to := strings.TrimSpace(req.To)
	if to == "" {
		failMail(c, invalid("to is required"))
		return
	}
	subject := strings.TrimSpace(req.Subject)
	if subject == "" {
		subject = "mxRaven Gin example"
	}
	text := req.Text
	if strings.TrimSpace(text) == "" && strings.TrimSpace(req.HTML) == "" {
		text = "Hello from the mxRaven Gin examples."
	}

	client, err := newMailClient()
	if err != nil {
		failMail(c, err)
		return
	}
	defer client.Close()

	from, err := mailFrom()
	if err != nil {
		failMail(c, err)
		return
	}

	msg := mail.NewMessage().
		From(from).
		To(to).
		Subject(subject).
		Text(text)
	if strings.TrimSpace(req.HTML) != "" {
		msg.HTML(req.HTML)
	}

	result, err := client.Send(c.Request.Context(), msg)
	if err != nil {
		failMail(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"messageRef": result.MessageRef,
		"success":    true,
		"message":    result.Message,
	})
}
