// Command cli collects plain Go examples for the mxRaven mail SDK.
//
// Each subcommand is self-contained: it builds its own clients from
// environment variables, prints a clear result line, and exits non-zero on
// failure.
package main

import (
	"errors"
	"fmt"
	"os"

	"github.com/synqronlabs/mxraven-go/mail"
)

const usage = `mxRaven Go CLI examples

Usage:
  go run . <command> [arguments]

Commands:
  send-email <to>                  Send a text and HTML email
  send-template <to> [name]        Render and send the welcome templates
  send-attachments <to>            Send a CSV attachment and an inline PNG
  send-delivery-by <to> [s] [N|R]  Request a delivery deadline with DELIVERBY
  send-raw <to>                    Stream a hand-built RFC 5322 message
  feedback spam|ham <file.eml>     Submit spam or ham training evidence
  feedback unsubscribe <token>     Perform a one-click unsubscribe
  webhook                          Verify and log incoming webhooks
  all <to>                         Run all five send examples

Environment:
  MXRAVEN_HOST, MXRAVEN_PORT, MXRAVEN_USERNAME, MXRAVEN_SECRET,
  MXRAVEN_MAIL_FROM, MXRAVEN_WEBHOOK_SECRET, MXRAVEN_FEEDBACK_BASE_URL,
  WEBHOOK_PORT

See README.md for details.`

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, usage)
		os.Exit(1)
	}

	args := os.Args[2:]
	var err error
	switch os.Args[1] {
	case "send-email":
		err = runSendEmail(args)
	case "send-template":
		err = runSendTemplate(args)
	case "send-attachments":
		err = runSendAttachments(args)
	case "send-delivery-by":
		err = runSendDeliveryBy(args)
	case "send-raw":
		err = runSendRaw(args)
	case "feedback":
		err = runFeedback(args)
	case "webhook":
		err = runWebhook(args)
	case "all":
		err = runAll(args)
	default:
		fmt.Fprintf(os.Stderr, "unknown command %q\n\n%s\n", os.Args[1], usage)
		os.Exit(1)
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

// newMailClient builds a submission client from the MXRAVEN_* environment.
// Every example constructs its own client and closes it with defer.
func newMailClient() (*mail.Client, error) {
	host, err := Require("MXRAVEN_HOST")
	if err != nil {
		return nil, err
	}
	username, err := Require("MXRAVEN_USERNAME")
	if err != nil {
		return nil, err
	}
	secret, err := Require("MXRAVEN_SECRET")
	if err != nil {
		return nil, err
	}
	return mail.New(
		mail.WithAddress(host, Port("MXRAVEN_PORT", mail.DefaultAddressPort)),
		mail.WithCredentials(username, secret),
	)
}

// usageError reports a bad invocation.
func usageError(message string) error {
	return errors.New(message)
}
