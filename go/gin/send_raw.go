package main

import (
	"bytes"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/synqronlabs/mxraven-go/mail"
)

type sendRawRequest struct {
	To      string `json:"to"`
	Subject string `json:"subject"`
	Text    string `json:"text"`
}

// handleSendRaw serializes an RFC 5322 message with CRLF line endings and
// streams it with SendRaw under an explicit envelope.
func handleSendRaw(c *gin.Context) {
	var req sendRawRequest
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
		subject = "Raw RFC 5322 example"
	}
	if strings.ContainsAny(to, "\r\n") || strings.ContainsAny(subject, "\r\n") {
		failMail(c, invalid("to and subject must not contain line breaks"))
		return
	}

	from, err := mailFrom()
	if err != nil {
		failMail(c, err)
		return
	}

	raw := buildRawMessage(from, to, subject, req.Text)

	client, err := newMailClient()
	if err != nil {
		failMail(c, err)
		return
	}
	defer client.Close()

	result, err := client.SendRaw(
		c.Request.Context(),
		mail.Envelope{From: from, To: []string{to}},
		bytes.NewReader(raw),
	)
	if err != nil {
		failMail(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"messageRef": result.MessageRef})
}

// buildRawMessage renders a minimal RFC 5322 message. SendRaw performs no
// parsing, so headers and line endings are the caller's responsibility.
func buildRawMessage(from, to, subject, text string) []byte {
	var buf bytes.Buffer
	fmt.Fprintf(&buf, "From: %s\r\n", from)
	fmt.Fprintf(&buf, "To: %s\r\n", to)
	fmt.Fprintf(&buf, "Subject: %s\r\n", subject)
	fmt.Fprintf(&buf, "Date: %s\r\n", time.Now().UTC().Format(time.RFC1123Z))
	fmt.Fprintf(&buf, "Message-ID: <%d@mxraven-examples.local>\r\n", time.Now().UnixNano())
	buf.WriteString("MIME-Version: 1.0\r\n")
	buf.WriteString("Content-Type: text/plain; charset=utf-8\r\n")
	buf.WriteString("\r\n")
	buf.WriteString(normalizeCRLF(text))
	buf.WriteString("\r\n")
	return buf.Bytes()
}

func normalizeCRLF(text string) string {
	text = strings.ReplaceAll(text, "\r\n", "\n")
	text = strings.ReplaceAll(text, "\r", "\n")
	return strings.ReplaceAll(text, "\n", "\r\n")
}
