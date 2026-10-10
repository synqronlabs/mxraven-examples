package main

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/synqronlabs/mxraven-go/mail"
)

// runSendDeliveryBy sends a message with a DELIVERBY deadline (RFC 2852).
// Arguments: <to> [seconds] [N|R], where R selects return mode (the default)
// and N selects notify mode.
func runSendDeliveryBy(args []string) error {
	if len(args) < 1 || len(args) > 3 {
		return usageError("usage: go run . send-delivery-by <to> [seconds] [N|R]")
	}
	to := args[0]
	seconds := 3600
	if len(args) >= 2 {
		value, err := strconv.Atoi(args[1])
		if err != nil || value <= 0 {
			return fmt.Errorf("invalid seconds %q: want a positive integer", args[1])
		}
		seconds = value
	}
	mode := mail.DeliveryReturn
	if len(args) == 3 {
		switch strings.ToLower(args[2]) {
		case "r", "return":
			mode = mail.DeliveryReturn
		case "n", "notify":
			mode = mail.DeliveryNotify
		default:
			return fmt.Errorf("invalid mode %q: want N or R", args[2])
		}
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

	// The submission server must advertise the DELIVERBY extension, otherwise
	// the send fails with mail.ErrDeliveryByUnsupported.
	result, err := client.Send(context.Background(), mail.NewMessage().
		From(from).
		To(to).
		Subject("Time-sensitive message").
		Text(fmt.Sprintf("Please deliver this message within %d seconds.", seconds)).
		DeliveryBy(mail.DeliveryBy{
			Within: time.Duration(seconds) * time.Second,
			Mode:   mode,
		}))
	if err != nil {
		if errors.Is(err, mail.ErrDeliveryByUnsupported) {
			return fmt.Errorf("server does not advertise DELIVERBY: %w", err)
		}
		return err
	}
	fmt.Printf("Accepted as %s (%s)\n", result.MessageRef, result.Message)
	return nil
}
