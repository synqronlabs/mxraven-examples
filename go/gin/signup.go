package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/synqronlabs/mxraven-go/mail"
)

type signupRequestOTPRequest struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

// handleSignupRequestOTP generates and emails a 6-digit verification code.
// The plaintext code is never returned in the response; it is logged only to
// make local testing possible.
func handleSignupRequestOTP(c *gin.Context) {
	var req signupRequestOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		fail(c, http.StatusBadRequest, "invalid JSON body")
		return
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	if !strings.Contains(email, "@") || strings.HasPrefix(email, "@") || strings.HasSuffix(email, "@") {
		failMail(c, invalid("a valid email is required"))
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = "there"
	}

	code, err := otps.Issue(email)
	if err != nil {
		failMail(c, err)
		return
	}
	log.Printf("[signup] OTP for %s: %s", email, code)

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
		To(email).
		Subject("Your verification code").
		Text(fmt.Sprintf("Hi %s,\n\nYour verification code is %s.\n\nIt expires in 10 minutes.\n", name, code)))
	if err != nil {
		failMail(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ok":               true,
		"messageRef":       result.MessageRef,
		"expiresInSeconds": otpExpiresInSec,
	})
}

type signupVerifyOTPRequest struct {
	Email string `json:"email"`
	OTP   string `json:"otp"`
}

// handleSignupVerifyOTP verifies a code and consumes it on success.
func handleSignupVerifyOTP(c *gin.Context) {
	var req signupVerifyOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		fail(c, http.StatusBadRequest, "invalid JSON body")
		return
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	otp := strings.TrimSpace(req.OTP)
	if email == "" || otp == "" {
		failMail(c, invalid("email and otp are required"))
		return
	}

	ok, status, message := otps.Verify(email, otp)
	if !ok {
		fail(c, status, message)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ok":       true,
		"verified": true,
		"email":    email,
	})
}
