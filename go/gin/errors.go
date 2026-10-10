package main

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/synqronlabs/mxraven-go/mail"
	"github.com/synqronlabs/mxraven-go/mail/feedback"
)

// validationError marks a request that failed input validation. It is mapped
// to 400 Bad Request by failMail.
type validationError struct {
	message string
}

func (e *validationError) Error() string { return e.message }

func invalid(format string, args ...any) error {
	return &validationError{message: fmt.Sprintf(format, args...)}
}

// fail writes a JSON error response.
func fail(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"error": message})
}

// failMail maps SDK and validation errors onto HTTP responses:
//
//   - *mail.SMTPError: 502 for permanent failures, 503 for transient ones,
//     with the SMTP code attached
//   - *feedback.Error: the service status code, with a retryable flag
//   - validation errors: 400
//   - anything else: 502
func failMail(c *gin.Context, err error) {
	if err == nil {
		fail(c, http.StatusBadGateway, "unknown error")
		return
	}

	var smtpErr *mail.SMTPError
	if errors.As(err, &smtpErr) {
		status := http.StatusBadGateway
		if smtpErr.Transient() {
			status = http.StatusServiceUnavailable
		}
		c.JSON(status, gin.H{"error": smtpErr.Error(), "code": smtpErr.Code})
		return
	}

	var feedbackErr *feedback.Error
	if errors.As(err, &feedbackErr) {
		c.JSON(feedbackErr.StatusCode, gin.H{"error": feedbackErr.Error(), "retryable": feedbackErr.Retryable()})
		return
	}

	var validationErr *validationError
	if errors.As(err, &validationErr) {
		fail(c, http.StatusBadRequest, validationErr.Error())
		return
	}

	fail(c, http.StatusBadGateway, err.Error())
}
