package main

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/synqronlabs/mxraven-go/mail"
)

var (
	otps   = newOTPStore()
	events = newEventLog()
)

type indexExample struct {
	Method      string `json:"method"`
	Path        string `json:"path"`
	Description string `json:"description"`
}

var examples = []indexExample{
	{Method: http.MethodGet, Path: "/", Description: "This index of example endpoints"},
	{Method: http.MethodPost, Path: "/api/send-email", Description: "Send a text and optional HTML email"},
	{Method: http.MethodPost, Path: "/api/send-template", Description: "Render text/template and html/template bodies and send them"},
	{Method: http.MethodPost, Path: "/api/send-attachments", Description: "Send a CSV attachment plus an inline cid image and an optional uploaded file"},
	{Method: http.MethodPost, Path: "/api/send-delivery-by", Description: "Send with an RFC 2852 DELIVERBY delivery deadline"},
	{Method: http.MethodPost, Path: "/api/send-raw", Description: "Stream a hand-serialized RFC 5322 message with SendRaw"},
	{Method: http.MethodPost, Path: "/api/feedback/learn", Description: "Train the spam filter with raw MIME as spam or ham"},
	{Method: http.MethodPost, Path: "/api/feedback/unsubscribe", Description: "Perform an RFC 8058 one-click unsubscribe"},
	{Method: http.MethodPost, Path: "/api/signup/request-otp", Description: "Email a 6-digit signup verification code"},
	{Method: http.MethodPost, Path: "/api/signup/verify-otp", Description: "Verify a signup code and consume it"},
	{Method: http.MethodPost, Path: "/api/webhook", Description: "Verify and record an mxRaven webhook delivery"},
	{Method: http.MethodGet, Path: "/api/webhook/events", Description: "List the most recent webhook events"},
}

func main() {
	router := gin.Default()
	registerRoutes(router)

	port := Port("PORT", 3000)
	log.Printf("mxRaven Gin examples listening on http://localhost:%d", port)
	if err := router.Run(":" + strconv.Itoa(port)); err != nil {
		log.Fatal(err)
	}
}

func registerRoutes(router *gin.Engine) {
	router.GET("/", handleIndex)
	router.POST("/api/send-email", handleSendEmail)
	router.POST("/api/send-template", handleSendTemplate)
	router.POST("/api/send-attachments", handleSendAttachments)
	router.POST("/api/send-delivery-by", handleSendDeliveryBy)
	router.POST("/api/send-raw", handleSendRaw)
	router.POST("/api/feedback/learn", handleFeedbackLearn)
	router.POST("/api/feedback/unsubscribe", handleFeedbackUnsubscribe)
	router.POST("/api/signup/request-otp", handleSignupRequestOTP)
	router.POST("/api/signup/verify-otp", handleSignupVerifyOTP)
	router.POST("/api/webhook", handleWebhook)
	router.GET("/api/webhook/events", handleWebhookEvents)
}

func handleIndex(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"name":     "mxRaven Go Gin REST API examples",
		"examples": examples,
	})
}

// newMailClient builds a submission client from environment configuration.
// The caller owns the returned client and must call Close.
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

// mailFrom returns the verified sending address used in the From header and
// the envelope.
func mailFrom() (string, error) {
	return Require("MXRAVEN_MAIL_FROM")
}
