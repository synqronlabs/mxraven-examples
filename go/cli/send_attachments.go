package main

import (
	"context"
	"encoding/base64"
	"fmt"

	"github.com/synqronlabs/mxraven-go/mail"
)

// reportCSV is a small CSV report attached to the message.
const reportCSV = `date,recipient,status
2026-10-01,customer@example.com,delivered
2026-10-02,customer@example.com,opened
`

// logoPNGBase64 is a 1x1 pixel PNG used as an inline image. The HTML body
// references it with cid:logo.
const logoPNGBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

// runSendAttachments sends a CSV attachment and an inline PNG.
func runSendAttachments(args []string) error {
	if len(args) != 1 {
		return usageError("usage: go run . send-attachments <to>")
	}
	from, err := Require("MXRAVEN_MAIL_FROM")
	if err != nil {
		return err
	}
	logo, err := base64.StdEncoding.DecodeString(logoPNGBase64)
	if err != nil {
		return fmt.Errorf("decode inline logo: %w", err)
	}
	client, err := newMailClient()
	if err != nil {
		return err
	}
	defer client.Close()

	result, err := client.Send(context.Background(), mail.NewMessage().
		From(from).
		To(args[0]).
		Subject("Report and inline logo").
		Text("The report is attached as report.csv. The HTML body embeds an inline 1x1 PNG.").
		HTML(`<p>The report is attached as <strong>report.csv</strong>.</p>
<p>Inline logo: <img src="cid:logo" alt="logo" width="1" height="1"></p>`).
		Attach(mail.Attachment{
			Filename:    "report.csv",
			ContentType: "text/csv",
			Data:        []byte(reportCSV),
		}).
		Attach(mail.Attachment{
			Filename:    "logo.png",
			ContentType: "image/png",
			Data:        logo,
			Inline:      true,
			ContentID:   "logo",
		}))
	if err != nil {
		return err
	}
	fmt.Printf("Accepted as %s (%s)\n", result.MessageRef, result.Message)
	return nil
}
