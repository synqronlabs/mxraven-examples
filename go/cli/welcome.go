package main

import (
	"bytes"
	"fmt"
	htmltemplate "html/template"
	texttemplate "text/template"
)

// welcomeData is the input for the welcome templates.
type welcomeData struct {
	Name string
}

// The templates are parsed once at package level. text/template renders the
// Subject and plain-text body; html/template renders the HTML body with
// automatic contextual escaping of the name.
var (
	welcomeSubjectTemplate = texttemplate.Must(
		texttemplate.New("welcome-subject").Parse("Welcome to mxRaven, {{.Name}}"))

	welcomeTextTemplate = texttemplate.Must(
		texttemplate.New("welcome-text").Parse(`Hi {{.Name}},

Welcome to mxRaven. This message was rendered with text/template and sent
through the mxRaven submission API.

Next steps:
  - Verify your sending domain
  - Create a submission API key
  - Watch your delivery webhooks

The mxRaven team
`))

	welcomeHTMLTemplate = htmltemplate.Must(
		htmltemplate.New("welcome-html").Parse(`<html>
  <body>
    <h1>Welcome to mxRaven, {{.Name}}!</h1>
    <p>This message was rendered with html/template and sent through the
    mxRaven submission API.</p>
    <ul>
      <li>Verify your sending domain</li>
      <li>Create a submission API key</li>
      <li>Watch your delivery webhooks</li>
    </ul>
    <p>The mxRaven team</p>
  </body>
</html>
`))
)

// renderWelcome renders the subject, text, and HTML bodies for name.
func renderWelcome(name string) (subject, text, html string, err error) {
	data := welcomeData{Name: name}
	var subjectBuf, textBuf, htmlBuf bytes.Buffer
	if err := welcomeSubjectTemplate.Execute(&subjectBuf, data); err != nil {
		return "", "", "", fmt.Errorf("render welcome subject: %w", err)
	}
	if err := welcomeTextTemplate.Execute(&textBuf, data); err != nil {
		return "", "", "", fmt.Errorf("render welcome text: %w", err)
	}
	if err := welcomeHTMLTemplate.Execute(&htmlBuf, data); err != nil {
		return "", "", "", fmt.Errorf("render welcome html: %w", err)
	}
	return subjectBuf.String(), textBuf.String(), htmlBuf.String(), nil
}
