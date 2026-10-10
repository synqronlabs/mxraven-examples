package main

import (
	"bytes"
	htmltemplate "html/template"
	"net/http"
	"strings"
	texttemplate "text/template"

	"github.com/gin-gonic/gin"
	"github.com/synqronlabs/mxraven-go/mail"
)

const welcomeTextBody = `Hello {{.Name}},

Welcome to the mxRaven Gin examples.

This body was rendered with text/template, and an HTML alternative was
rendered with html/template.

Thanks,
The mxRaven team
`

const welcomeHTMLBody = `<h1>Welcome, {{.Name}}!</h1>
<p>This body was rendered with <code>html/template</code>.</p>
<p>The plain text alternative was rendered with <code>text/template</code>.</p>`

var (
	welcomeText = texttemplate.Must(texttemplate.New("welcome-text").Parse(welcomeTextBody))
	welcomeHTML = htmltemplate.Must(htmltemplate.New("welcome-html").Parse(welcomeHTMLBody))
)

type sendTemplateRequest struct {
	To   string `json:"to"`
	Name string `json:"name"`
}

// handleSendTemplate renders both templates once parsed at startup and sends
// the result as a multipart/alternative message.
func handleSendTemplate(c *gin.Context) {
	var req sendTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		fail(c, http.StatusBadRequest, "invalid JSON body")
		return
	}

	to := strings.TrimSpace(req.To)
	if to == "" {
		failMail(c, invalid("to is required"))
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = "there"
	}
	data := struct{ Name string }{Name: name}

	var textBody, htmlBody bytes.Buffer
	if err := welcomeText.Execute(&textBody, data); err != nil {
		failMail(c, err)
		return
	}
	if err := welcomeHTML.Execute(&htmlBody, data); err != nil {
		failMail(c, err)
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

	result, err := client.Send(c.Request.Context(), mail.NewMessage().
		From(from).
		To(to).
		Subject("Welcome to mxRaven, "+name).
		Text(textBody.String()).
		HTML(htmlBody.String()))
	if err != nil {
		failMail(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"messageRef": result.MessageRef})
}
