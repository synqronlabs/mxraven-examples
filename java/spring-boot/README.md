# mxRaven Spring Boot examples (Java)

A Spring Boot API showing how to send and receive mail with the
[`com.mxraven:mail`](https://central.sonatype.com/artifact/com.mxraven/mail)
Java SDK. API only: every example is a REST endpoint. The plain Java CLI
version lives in [`../plain`](../plain).

## Setup

```bash
cp .env.example .env   # fill in your mxRaven credentials
./gradlew bootRun
```

The server listens on port 3000 (`PORT`). `GET /` returns a JSON index of
every example. Spring loads `.env` through
`spring.config.import=optional:file:./.env[.properties]`.

## Endpoints

| Method | Path | Shows |
| --- | --- | --- |
| `POST` | `/api/send-email` | `MailBuilder` with a text body and optional HTML body |
| `POST` | `/api/send-template` | Subject and bodies built by a plain Java template method |
| `POST` | `/api/send-attachments` | `attachFile` and `attachInline` with `cid:`, optional base64 upload |
| `POST` | `/api/send-delivery-by` | `Envelope.deliveryBy`, DSN params, and `envId` |
| `POST` | `/api/send-raw` | `sendRaw` with serialized RFC 5322 bytes and per-recipient DSNs |
| `POST` | `/api/feedback/learn` | Spam/ham training with the exact raw bytes (base64) |
| `POST` | `/api/feedback/unsubscribe` | RFC 8058 one-click unsubscribe |
| `POST` | `/api/parse-inbound` | `ParsedEmail.parse` for headers, bodies, and attachments |
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
```

Every endpoint builds its own `SmtpConfig` from the environment and closes the
client with try-with-resources. `DELIVERBY` and DSN parameters require server
support and fail before transfer when unsupported.

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

## Signup OTP

`POST /api/signup/request-otp` generates a 6-digit code with `SecureRandom`,
stores only its SHA-256 hash in memory (10 minute TTL, 5 attempts), and emails
the code with the SDK. The code is never returned in the response; for local
testing it is printed to the console. `POST /api/signup/verify-otp` compares in
constant time (`MessageDigest.isEqual`) and consumes the code on success. The
in-memory store is for the demo only; production flows should use a database or
cache with rate limits.

## Webhooks

`POST /api/webhook` verifies the `X-MxRaven-Signature` HMAC, decodes the
payload, and dispatches typed events: `inbound_email` (downloads and parses the
raw message), `delivery_status`, and `s3_egress_status`.

1. Start the API with `./gradlew bootRun`.
2. Expose it publicly, e.g. `ngrok http 3000` or
   `cloudflared tunnel --url http://localhost:3000`.
3. In mxRaven, create a webhook endpoint pointing at
   `https://<tunnel-host>/api/webhook`.
4. Copy its signing secret into `MXRAVEN_WEBHOOK_SECRET` and restart.

A listener that throws makes the route answer `500`, which makes mxRaven retry
the delivery. `GET /api/webhook/events` shows what was recorded.

## Layout

```
src/main/java/com/mxraven/examples/springboot/
  Application.java      Spring Boot entry point
  api/                  one self-contained controller per example
  services/             demo stores (OTP codes, webhook events)
  templates/            the plain Java template used by send-template
```
