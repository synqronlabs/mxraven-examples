# mxRaven Express examples (JavaScript)

An Express API showing how to send and receive mail with
[`@mxraven/mail`](https://www.npmjs.com/package/@mxraven/mail). API only: every
example is a route handler, and each one is self-contained. This is the plain
JavaScript version; the TypeScript version lives in
[`../typescript`](../typescript).

## Setup

```bash
npm install
cp .env.example .env   # fill in your mxRaven credentials
npm run dev            # or: npm start
```

The server listens on port 3000 (`PORT`). `GET /` returns a JSON index of
every example.

## Endpoints

| Method | Path | Shows |
| --- | --- | --- |
| `POST` | `/api/send-email` | `Message` with `text` and optional `html` (`multipart/alternative`) |
| `POST` | `/api/send-template` | A plain template renderer (the `TemplateRenderer` contract) |
| `POST` | `/api/send-attachments` | `attach` and `attachInline` with `cid:`, optional base64 upload |
| `POST` | `/api/send-delivery-by` | `DELIVERBY` and DSN envelope parameters |
| `POST` | `/api/send-raw` | `sendRaw` with serialized RFC 5322 bytes and per-recipient DSNs |
| `POST` | `/api/feedback/learn` | Spam/ham training with the exact raw bytes (base64) |
| `POST` | `/api/feedback/unsubscribe` | RFC 8058 one-click unsubscribe |
| `POST` | `/api/parse-inbound` | `parseEmail` for headers, bodies, and attachments |
| `POST` | `/api/signup/request-otp` | Email a one-time signup code (only its hash is stored) |
| `POST` | `/api/signup/verify-otp` | Constant-time verification with expiry and attempt limits |
| `POST` | `/api/webhook` | Signature verification and typed event dispatch |
| `GET` | `/api/webhook/events` | Recent webhook events, newest first |

```bash
curl -s localhost:3000/api/send-email \
  -H 'Content-Type: application/json' \
  -d '{"to":"you@example.com","subject":"Hello","text":"Hi from mxRaven"}'

curl -s localhost:3000/api/send-template \
  -H 'Content-Type: application/json' \
  -d '{"to":"you@example.com","name":"Ada"}'

curl -s localhost:3000/api/send-delivery-by \
  -H 'Content-Type: application/json' \
  -d '{"to":"you@example.com","seconds":3600,"mode":"R","envid":"order-42"}'

curl -s localhost:3000/api/parse-inbound --data-binary @message.eml

curl -s localhost:3000/api/signup/request-otp \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","name":"Ada"}'

curl -s localhost:3000/api/signup/verify-otp \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","otp":"123456"}'
```

Every route creates its own client from the environment and closes it in
`finally`. `DELIVERBY` and DSN parameters require server support and fail
before transfer when unsupported. `SMTPError.permanent` (5xx) means do not
retry; `SMTPError.transient` (4xx) may succeed later.

## Environment

| Variable | Purpose |
| --- | --- |
| `MXRAVEN_HOST` | SMTP submission host, e.g. `smtp.mxraven.email` |
| `MXRAVEN_PORT` | Submission port, defaults to `587` |
| `MXRAVEN_USERNAME` | Submission API key username, e.g. `mxr_tx_ab12cd34ef56` |
| `MXRAVEN_SECRET` | Submission API key secret |
| `MXRAVEN_WEBHOOK_SECRET` | Signing secret of the webhook endpoint |
| `MXRAVEN_MAIL_FROM` | Sender mailbox used by the examples |
| `MXRAVEN_FEEDBACK_BASE_URL` | Feedback service URL, defaults to `https://feedback.mxraven.com` |
| `PORT` | HTTP port, defaults to `3000` |

## Webhooks

`POST /api/webhook` verifies the `X-MxRaven-Signature` HMAC, decodes the
payload, and dispatches typed events: `inbound_email` (downloads and parses the
raw message), `delivery_status`, and `s3_egress_status`. The route is mounted
with `express.raw()` so the signature covers the exact request bytes, and
`trust proxy` makes the URL reflect forwarded headers.

1. Start the API with `npm run dev`.
2. Expose it publicly, e.g. `ngrok http 3000` or
   `cloudflared tunnel --url http://localhost:3000`.
3. In mxRaven, create a webhook endpoint pointing at
   `https://<tunnel-host>/api/webhook`.
4. Copy its signing secret into `MXRAVEN_WEBHOOK_SECRET` and restart.

A listener that throws makes the route answer `500`, which makes mxRaven retry
the delivery. `GET /api/webhook/events` shows what was recorded.

## Signup OTP

`POST /api/signup/request-otp` generates a 6-digit code with a CSPRNG, stores
only its SHA-256 hash in memory (10 minute TTL, 5 attempts), and emails the
code with `@mxraven/mail`. The code is never returned in the response; for
local testing it is printed to the server console. `POST /api/signup/verify-otp`
compares in constant time and consumes the code on success.

The in-memory store is for the demo only. Production flows should keep pending
codes in a database or cache, scoped per account, with rate limits.

## Feedback

`POST /api/feedback/learn` takes `{"label":"spam"|"ham","rawMimeBase64":"..."}`
with the exact bytes mxRaven processed; the service matches them against stored
evidence by SHA-256. `POST /api/feedback/unsubscribe` takes `{"token":"..."}`,
the operation a mail client runs against a `List-Unsubscribe` URL.

## Layout

```
src/
  server.js             Express app, raw-body mounts, JSON index
  routes/               one self-contained router per example
  lib/                  demo fixtures (event log, sample message)
```
