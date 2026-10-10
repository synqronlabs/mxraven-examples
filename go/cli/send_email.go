package main

import (
	"context"
	"fmt"

	"github.com/synqronlabs/mxraven-go/mail"
)

// runSendEmail sends a message with both plain-text and HTML bodies. The SDK
// serializes the pair as multipart/alternative.
func runSendEmail(args []string) error {
	if len(args) != 1 {
		return usageError("usage: go run . send-email <to>")
	}
	from, err := Require("MXRAVEN_MAIL_FROM")
	if err != nil {
		return err
	}
	client, err := newMailClient()
	if err != nil {
		return err
	}
	defer client.Close()

	result, err := client.Send(context.Background(), mail.NewMessage().
		From(from).
		To(args[0]).
		Subject("Hello from mxRaven").
		Text("This is the plain-text body. It is sent together with an HTML body as multipart/alternative.").
		HTML("<p>This is the <strong>HTML</strong> body, sent together with a plain-text body as <code>multipart/alternative</code>.</p>"))
	if err != nil {
		return err
	}
	fmt.Printf("Accepted as %s (%s)\n", result.MessageRef, result.Message)
	return nil
}
