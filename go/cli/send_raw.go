package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/synqronlabs/mxraven-go/mail"
)

// runSendRaw serializes an RFC 5322 message by hand and streams it with
// SendRaw, which sends pre-rendered bytes without parsing them.
func runSendRaw(args []string) error {
	if len(args) != 1 {
		return usageError("usage: go run . send-raw <to>")
	}
	to := args[0]
	from, err := Require("MXRAVEN_MAIL_FROM")
	if err != nil {
		return err
	}

	messageID := fmt.Sprintf("<%d@%s>", time.Now().UnixNano(), messageIDDomain(from))
	var raw strings.Builder
	raw.WriteString("From: " + from + "\r\n")
	raw.WriteString("To: " + to + "\r\n")
	raw.WriteString("Subject: Hand-built RFC 5322 message\r\n")
	raw.WriteString("Date: " + time.Now().Format(time.RFC1123Z) + "\r\n")
	raw.WriteString("Message-ID: " + messageID + "\r\n")
	raw.WriteString("MIME-Version: 1.0\r\n")
	raw.WriteString("Content-Type: text/plain; charset=utf-8\r\n")
	raw.WriteString("\r\n")
	raw.WriteString("This message was serialized by hand and streamed with SendRaw.\r\n")

	client, err := newMailClient()
	if err != nil {
		return err
	}
	defer client.Close()

	result, err := client.SendRaw(context.Background(), mail.Envelope{
		From: from,
		To:   []string{to},
	}, strings.NewReader(raw.String()))
	if err != nil {
		return err
	}
	fmt.Printf("Accepted as %s (%s)\n", result.MessageRef, result.Message)
	return nil
}

// messageIDDomain extracts the domain of a From address for use in a
// Message-ID. It handles both "user@example.com" and "Name <user@example.com>".
func messageIDDomain(from string) string {
	at := strings.LastIndex(from, "@")
	if at < 0 {
		return "localhost"
	}
	domain := strings.TrimSpace(strings.TrimRight(from[at+1:], ">"))
	if domain == "" {
		return "localhost"
	}
	return domain
}
