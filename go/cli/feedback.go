package main

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"

	"github.com/synqronlabs/mxraven-go/mail/feedback"
)

// runFeedback submits spam or ham training evidence, or performs a one-click
// unsubscribe.
func runFeedback(args []string) error {
	if len(args) < 1 {
		return usageError("usage: go run . feedback spam|ham <file.eml>, or go run . feedback unsubscribe <token>")
	}
	baseURL, err := Require("MXRAVEN_FEEDBACK_BASE_URL")
	if err != nil {
		return err
	}

	switch args[0] {
	case "spam", "ham":
		if len(args) != 2 {
			return usageError("usage: go run . feedback spam|ham <file.eml>")
		}
		raw, err := os.ReadFile(args[1])
		if err != nil {
			return fmt.Errorf("read %s: %w", args[1], err)
		}
		username, err := Require("MXRAVEN_USERNAME")
		if err != nil {
			return err
		}
		secret, err := Require("MXRAVEN_SECRET")
		if err != nil {
			return err
		}
		client, err := feedback.New(
			feedback.WithBaseURL(baseURL),
			feedback.WithCredentials(username, secret),
		)
		if err != nil {
			return err
		}

		var result *feedback.LearningResult
		if args[0] == "spam" {
			result, err = client.LearnSpam(context.Background(), bytes.NewReader(raw))
		} else {
			result, err = client.LearnHam(context.Background(), bytes.NewReader(raw))
		}
		if err != nil {
			var feedbackErr *feedback.Error
			if errors.As(err, &feedbackErr) {
				return fmt.Errorf("learn failed: status=%d retryable=%t: %s",
					feedbackErr.StatusCode, feedbackErr.Retryable(), feedbackErr.Message)
			}
			return err
		}
		fmt.Printf("Learned %s: status=%s disposition=%s matched=%s\n",
			args[1], result.Status, result.Disposition, result.MatchedHashKind)
		return nil

	case "unsubscribe":
		if len(args) != 2 {
			return usageError("usage: go run . feedback unsubscribe <token>")
		}
		client, err := feedback.New(feedback.WithBaseURL(baseURL))
		if err != nil {
			return err
		}
		if err := client.Unsubscribe(context.Background(), args[1]); err != nil {
			var feedbackErr *feedback.Error
			if errors.As(err, &feedbackErr) {
				return fmt.Errorf("unsubscribe failed: status=%d retryable=%t: %s",
					feedbackErr.StatusCode, feedbackErr.Retryable(), feedbackErr.Message)
			}
			return err
		}
		fmt.Printf("Unsubscribed %s\n", args[1])
		return nil

	default:
		return usageError("usage: go run . feedback spam|ham <file.eml>, or go run . feedback unsubscribe <token>")
	}
}
