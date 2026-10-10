# mxRaven Go CLI examples

Plain Go examples for the [mxRaven Go SDK](https://github.com/synqronlabs/mxraven-go).
Every command builds its own clients from environment variables, prints a
clear result line, and exits non-zero on failure.

## Setup

```sh
cp .env.example .env
# edit .env with your credentials
go run . send-email you@example.com
```

The `.env` loader looks in the working directory and up to three parent
directories, then falls back to the process environment.

## Commands

| Command | Description |
| --- | --- |
| `go run . send-email <to>` | Send text and HTML bodies as multipart/alternative. |
| `go run . send-template <to> [name]` | Render the welcome templates and send them. |
| `go run . send-attachments <to>` | Attach a CSV report and an inline PNG referenced by `cid:`. |
| `go run . send-delivery-by <to> [seconds] [N\|R]` | Request a DELIVERBY deadline (default 3600 seconds, return mode). |
| `go run . send-raw <to>` | Stream a hand-built RFC 5322 message with `SendRaw`. |
| `go run . feedback spam\|ham <file.eml>` | Submit spam or ham training evidence. |
| `go run . feedback unsubscribe <token>` | Perform an RFC 8058 one-click unsubscribe. |
| `go run . webhook` | Run the webhook verification server. |
| `go run . all <to>` | Run the five send examples in order. |

## Environment

| Variable | Description |
| --- | --- |
| `MXRAVEN_HOST` | Submission server host. |
| `MXRAVEN_PORT` | Submission server port (default 587). |
| `MXRAVEN_USERNAME` | Submission API key username. |
| `MXRAVEN_SECRET` | Submission API key secret. |
| `MXRAVEN_MAIL_FROM` | Sender address on a verified sending domain. |
| `MXRAVEN_WEBHOOK_SECRET` | Webhook signing secret. |
| `MXRAVEN_FEEDBACK_BASE_URL` | Feedback service base URL. |
| `WEBHOOK_PORT` | Webhook server port (default 3000). |

## Webhooks

The `webhook` command verifies `X-MxRaven-*` signatures with the webhook SDK
and logs inbound email, delivery status, and storage status events on
`/webhook`.

1. Start the server: `go run . webhook` (listens on port 3000 by default).
2. Expose it publicly:

   ```sh
   ngrok http 3000
   ```

3. Register `https://<ngrok-host>/webhook` as an mxRaven webhook endpoint and
   copy the one-time signing secret into `MXRAVEN_WEBHOOK_SECRET`.
4. Send a test delivery and watch the log lines.

Set `WEBHOOK_PORT` to change the local port. Before verifying, the handler
sets `r.URL.Host` from `X-Forwarded-Host` (falling back to the `Host` header),
because the signature covers the request host and server requests carry an
empty `r.URL.Host`.

Responses are `204` on success, `401` for `webhook.ErrInvalidSignature`, and
`400` for any other verification or decoding error.

## Feedback

```sh
go run . feedback spam path/to/message.eml
go run . feedback ham path/to/message.eml
go run . feedback unsubscribe <token>
```

Learning submits the exact raw message bytes; the service matches them by
SHA-256 and reports the status, disposition, and matched hash kind. The
unsubscribe command calls the RFC 8058 one-click endpoint.

## Layout

```
go/cli
  all.go               run every send example
  env.go               .env loader and environment helpers
  feedback.go          spam/ham learning and one-click unsubscribe
  main.go              command dispatch, usage, client helper
  send_attachments.go  CSV attachment and inline CID image
  send_delivery_by.go  DELIVERBY deadline example
  send_email.go        text and HTML send
  send_raw.go          hand-built RFC 5322 message with SendRaw
  send_template.go     rendered welcome message
  welcome.go           text/template and html/template sources
  webhook.go           webhook verification server
  README.md
```

## Why is there no parsing example?

The Go SDK does not ship a MIME parser. The webhook example downloads the raw
message with `RawEmail.Fetch` and logs its size; feed those bytes to your own
parser, to the feedback endpoints, or to the `SendRaw` path.
