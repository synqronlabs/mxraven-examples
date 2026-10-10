package main

import (
	"context"
	"fmt"

	"github.com/synqronlabs/mxraven-go/mail"
)

// runSendTemplate renders the welcome templates from welcome.go and sends the
// result.
func runSendTemplate(args []string) error {
	if len(args) < 1 || len(args) > 2 {
		return usageError("usage: go run . send-template <to> [name]")
	}
	to := args[0]
	name := "friend"
	if len(args) == 2 {
		name = args[1]
	}

	from, err := Require("MXRAVEN_MAIL_FROM")
	if err != nil {
		return err
	}
	subject, text, htmlBody, err := renderWelcome(name)
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
		To(to).
		Subject(subject).
		Text(text).
		HTML(htmlBody))
	if err != nil {
		return err
	}
	fmt.Printf("Accepted as %s (%s)\n", result.MessageRef, result.Message)
	return nil
}
