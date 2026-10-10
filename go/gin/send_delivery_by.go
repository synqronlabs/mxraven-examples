package main

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/synqronlabs/mxraven-go/mail"
)

type sendDeliveryByRequest struct {
	To      string `json:"to"`
	Seconds int    `json:"seconds"`
	Mode    string `json:"mode"`
}

// handleSendDeliveryBy sends a message with an RFC 2852 DELIVERBY deadline.
// The submission server must advertise DELIVERBY, otherwise the send fails
// with mail.ErrDeliveryByUnsupported.
func handleSendDeliveryBy(c *gin.Context) {
	var req sendDeliveryByRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		fail(c, http.StatusBadRequest, "invalid JSON body")
		return
	}

	to := strings.TrimSpace(req.To)
	if to == "" {
		failMail(c, invalid("to is required"))
		return
	}
	seconds := req.Seconds
	if seconds <= 0 {
		seconds = 3600
	}

	// "R" returns the message at the deadline (the default, like the other
	// stacks); "N" only notifies.
	modeName := strings.ToUpper(strings.TrimSpace(req.Mode))
	var mode mail.DeliveryMode
	switch strings.ToLower(modeName) {
	case "", "r", "return":
		mode = mail.DeliveryReturn
		modeName = "R"
	case "n", "notify":
		mode = mail.DeliveryNotify
		modeName = "N"
	default:
		failMail(c, invalid("mode must be \"N\" or \"R\""))
		return
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
		Subject("Delivery deadline example").
		Text("This message requests delivery within the configured window.").
		DeliveryBy(mail.DeliveryBy{
			Within: time.Duration(seconds) * time.Second,
			Mode:   mode,
		})

	result, err := client.Send(c.Request.Context(), msg)
	if err != nil {
		failMail(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"messageRef": result.MessageRef,
		"seconds":    seconds,
		"mode":       modeName,
	})
}
