package main

import (
	"encoding/base64"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/synqronlabs/mxraven-go/mail"
)

// onePixelPNGBase64 is a valid 1x1 transparent PNG used as an inline image.
const onePixelPNGBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

var onePixelPNG = func() []byte {
	data, err := base64.StdEncoding.DecodeString(onePixelPNGBase64)
	if err != nil {
		panic(err)
	}
	return data
}()

type attachmentUpload struct {
	Filename    string `json:"filename"`
	ContentType string `json:"contentType"`
	DataBase64  string `json:"dataBase64"`
}

type sendAttachmentsRequest struct {
	To   string            `json:"to"`
	File *attachmentUpload `json:"file"`
}

// handleSendAttachments sends a CSV attachment, embeds a 1x1 PNG inline with
// cid "logo", and attaches the optional caller-supplied file.
func handleSendAttachments(c *gin.Context) {
	var req sendAttachmentsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		fail(c, http.StatusBadRequest, "invalid JSON body")
		return
	}

	to := strings.TrimSpace(req.To)
	if to == "" {
		failMail(c, invalid("to is required"))
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

	attachments := 2
	msg := mail.NewMessage().
		From(from).
		To(to).
		Subject("Your report").
		Text("The latest report is attached. The logo is embedded in the HTML body.").
		HTML(`<p>The latest report is attached.</p><p><img src="cid:logo" alt="logo"></p>`).
		Attach(mail.Attachment{
			Filename:    "report.csv",
			ContentType: "text/csv",
			Data:        []byte("id,name\n1,Ada\n2,Grace\n"),
		}).
		AttachInline("logo.png", "logo", onePixelPNG)

	if req.File != nil && strings.TrimSpace(req.File.DataBase64) != "" {
		data, err := base64.StdEncoding.DecodeString(req.File.DataBase64)
		if err != nil {
			failMail(c, invalid("file.dataBase64 must be valid base64"))
			return
		}
		filename := strings.TrimSpace(req.File.Filename)
		if filename == "" {
			filename = "upload.bin"
		}
		contentType := strings.TrimSpace(req.File.ContentType)
		if contentType == "" {
			contentType = "application/octet-stream"
		}
		msg.Attach(mail.Attachment{
			Filename:    filename,
			ContentType: contentType,
			Data:        data,
		})
		attachments++
	}

	result, err := client.Send(c.Request.Context(), msg)
	if err != nil {
		failMail(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"messageRef":  result.MessageRef,
		"attachments": attachments,
	})
}
