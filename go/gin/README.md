# mxRaven Go Gin REST API examples

A small Gin application that exercises the `github.com/synqronlabs/mxraven-go`
mail SDK: SMTP submission, message builder helpers, raw sends, delivery
deadlines, recipient feedback, signup OTP verification, and webhook
verification.

Each handler builds its own `mail.Client` from environment configuration and
closes it with `defer`, so every request uses current credentials.

## Run

```sh
cp .env.example .env   # fill in your credentials
go run .
```

The server listens on `PORT` (default `3000`): http://localhost:3000/

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | JSON index listing every example endpoint |
| POST | `/api/send-email` | Send a text body with an optional HTML alternative |
| POST | `/api/send-template` | Render `text/template` and `html/template` bodies and send them |
| POST | `/api/send-attachments` | Send a CSV attachment, an inline `cid:logo` PNG, and an optional file |
| POST | `/api/send-delivery-by` | Send with an RFC 2852 `DELIVERBY` deadline |
| POST | `/api/send-raw` | Serialize RFC 5322 by hand and stream it with `SendRaw` |
| POST | `/api/feedback/learn` | Train the spam filter with raw MIME as spam or ham |
| POST | `/api/feedback/unsubscribe` | Perform an RFC 8058 one-click unsubscribe |
| POST | `/api/signup/request-otp` | Email a 6-digit signup verification code |
| POST | `/api/signup/verify-otp` | Verify and consume a signup code |
| POST | `/api/webhook` | Verify, decode, and record an mxRaven webhook delivery |
| GET | `/api/webhook/events` | List the 25 most recent webhook events |

## Environment

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `MXRAVEN_HOST` | yes | - | SMTP submission host |
| `MXRAVEN_PORT` | no | `587` | SMTP submission port |
| `MXRAVEN_USERNAME` | yes | - | Submission API key username |
| `MXRAVEN_SECRET` | yes | - | Submission API key secret |
| `MXRAVEN_WEBHOOK_SECRET` | for webhooks | - | Webhook endpoint signing secret |
| `MXRAVEN_MAIL_FROM` | yes | - | Verified sending address |
| `MXRAVEN_FEEDBACK_BASE_URL` | no | `https://feedback.mxraven.com` | Feedback service base URL |
| `PORT` | no | `3000` | HTTP listen port |

The loader reads `.env` from the working directory, then up to three parent
directories, and falls back to the process environment.

## Curl examples

```sh
curl -s localhost:3000/ | jq

curl -s localhost:3000/api/send-email \
  -H 'Content-Type: application/json' \
  -d '{"to":"you@example.com","subject":"Hello","text":"Plain body","html":"<p>HTML body</p>"}'

curl -s localhost:3000/api/send-template \
  -H 'Content-Type: application/json' \
  -d '{"to":"you@example.com","name":"Ada"}'

curl -s localhost:3000/api/send-attachments \
  -H 'Content-Type: application/json' \
  -d '{"to":"you@example.com","file":{"filename":"hello.txt","contentType":"text/plain","dataBase64":"aGVsbG8="}}'

curl -s localhost:3000/api/send-delivery-by \
  -H 'Content-Type: application/json' \
  -d '{"to":"you@example.com","seconds":3600,"mode":"R"}'

curl -s localhost:3000/api/send-raw \
  -H 'Content-Type: application/json' \
  -d '{"to":"you@example.com","subject":"Raw","text":"Streamed as-is."}'

curl -s localhost:3000/api/feedback/learn \
  -H 'Content-Type: application/json' \
  -d '{"label":"spam","rawMimeBase64":"RnJvbTogc2VuZGVyQGV4YW1wbGUubmV0DQoNCmJvZHkNCg=="}'

curl -s localhost:3000/api/feedback/unsubscribe \
  -H 'Content-Type: application/json' \
  -d '{"token":"unsubscribe-token"}'

curl -s localhost:3000/api/signup/request-otp \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","name":"Ada"}'

curl -s localhost:3000/api/signup/verify-otp \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","otp":"123456"}'

curl -s localhost:3000/api/webhook/events | jq
```

## Signup OTP

`POST /api/signup/request-otp` generates a cryptographically random 6-digit
code, stores only `SHA-256(email + ":" + code)`, and emails the code. Codes
expire after 10 minutes, allow 5 attempts, and are compared in constant time
and consumed on success.

The plaintext code is never returned by the API. For local testing only, the
server logs it:

```
[signup] OTP for ada@example.com: 123456
```

`POST /api/signup/verify-otp` returns:

```json
{"ok": true, "verified": true, "email": "ada@example.com"}
```

## Webhook

mxRaven signs each delivery with HMAC-SHA256 over a canonical request string.
The signature covers the request host, and direct server requests have an
empty `r.URL.Host`, so the handler restores it from `X-Forwarded-Host` (or the
request host) before verifying.

Test locally with ngrok on the default port 3000:

```sh
go run .                 # or PORT=3000 go run .
ngrok http 3000
```

Register `https://<your-subdomain>.ngrok.app/api/webhook` as the webhook
endpoint in mxRaven and put the signing secret in `MXRAVEN_WEBHOOK_SECRET`.
The handler responds:

| Status | Meaning |
| --- | --- |
| `204` | Delivery verified and recorded |
| `401` | Invalid signature |
| `400` | Missing or malformed headers or payload |

Recorded events are available from `GET /api/webhook/events`:

```json
{
  "events": [
    {
      "id": 1,
      "type": "delivery_status",
      "summary": "task=task_test_1 status=delivered smtpCode=250 enhancedStatus=2.0.0",
      "receivedAt": "2026-10-10T12:00:00Z"
    }
  ]
}
```

## Feedback

- `POST /api/feedback/learn` accepts `{"label":"spam"|"ham","rawMimeBase64":"..."}`.
  The bytes must be the exact raw MIME mxRaven processed; the service matches
  them by SHA-256. Success returns `status`, `disposition`, `tenantId`, and
  `matchedHashKind`.
- `POST /api/feedback/unsubscribe` accepts `{"token":"..."}` and performs an
  RFC 8058 one-click unsubscribe. Success returns `{"ok":true}`.

Feedback errors keep the service status code and include a `retryable` flag
for 429 and 5xx responses.

## Error mapping

`failMail` maps SDK errors to HTTP responses:

| Error | Status | Body |
| --- | --- | --- |
| `*mail.SMTPError` permanent (5xx) | `502` | `{"error", "code"}` |
| `*mail.SMTPError` transient (4xx) | `503` | `{"error", "code"}` |
| `*feedback.Error` | service status | `{"error", "retryable"}` |
| Validation error | `400` | `{"error"}` |
| Anything else | `502` | `{"error"}` |

## Layout

```text
go/gin/
  errors.go            fail / failMail response helpers
  env.go               .env loader with Get, Require, Port
  events.go            bounded in-memory webhook event log
  feedback.go          spam/ham learning and unsubscribe handlers
  main.go              router, index, shared mail client helper
  otp.go               in-memory signup code store
  send_attachments.go  attachments and inline cid image handler
  send_delivery_by.go  DELIVERBY handler
  send_email.go        text/HTML email handler
  send_raw.go          raw RFC 5322 message handler
  send_template.go     text/template and html/template handler
  signup.go            request-otp and verify-otp handlers
  webhook.go           webhook verification and event listing
```

## Note on parsing

There is no parse endpoint in these examples: the Go SDK does not ship a MIME
parser. Inbound webhook payloads are verified, summarized, and their raw
bytes fetched, but parsing the message body is left to the caller.
