# mxRaven Java examples (plain CLI)

Plain Java 17 programs for every mxRaven mail action, using the
`com.mxraven:mail:2.0.4` SDK. No framework, one Gradle subproject, and a real
webhook listener built on the JDK HTTP server.

## Setup

```bash
cp .env.example .env   # fill in your mxRaven credentials
```

The examples load `.env` from the current directory or up to three parents, and
fall back to the process environment.

## Commands

Run every command from the `java/` directory as a Gradle subproject task.

| Command | What it does |
| --- | --- |
| `./gradlew run --args="send-email <to>"` | Plain text plus an HTML alternative |
| `./gradlew run --args="send-template <to> [name]"` | Built from a plain Java template method |
| `./gradlew run --args="send-attachments <to>"` | File attachment and inline `cid:` image |
| `./gradlew run --args="send-delivery-by <to> [seconds] [envid]"` | `DELIVERBY` and DSN envelope parameters |
| `./gradlew run --args="send-raw <to>"` | Pre-serialized RFC 5322 bytes with per-recipient DSNs |
| `./gradlew run --args="feedback spam <file.eml>"` | Trains the spam filter with exact raw bytes |
| `./gradlew run --args="feedback ham <file.eml>"` | Trains the ham filter with exact raw bytes |
| `./gradlew run --args="feedback unsubscribe <token>"` | RFC 8058 one-click unsubscribe |
| `./gradlew run --args="parse [file.eml]"` | Parses MIME into headers, bodies, and attachments |
| `./gradlew run --args="webhook"` | Starts the HTTP listener on port 3000 (`WEBHOOK_PORT`) |
| `./gradlew run --args="all <to>"` | Runs every send example in sequence |
| `./gradlew :plain:build` | Compiles and packages the subproject |

```bash
./gradlew :plain:run --args="send-email you@example.com"
./gradlew :plain:run --args="all you@example.com"
```

Each example creates its own client from the environment and closes it in a
try-with-resources block. `DELIVERBY` and DSN parameters require server support
and fail before transfer when unsupported. `SmtpException` means the server
rejected or dropped the session; an `IOException` means the connection itself
failed.

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
| `WEBHOOK_PORT` | Listener port for the `webhook` command, defaults to `3000` |

## Webhooks

`./gradlew run --args="webhook"` starts a JDK HTTP server that verifies
the `X-MxRaven-Signature` HMAC, decodes the payload, and dispatches typed
events. `WebhookCallbacks` handles the three event shapes: `inbound_email`
(the listener calls `parse()` to download and parse the raw message),
`delivery_status`, and `s3_egress_status`.

1. Start the listener with the `webhook` command.
2. Expose it publicly, e.g. `ngrok http 3000` or
   `cloudflared tunnel --url http://localhost:3000`.
3. In mxRaven, create a webhook endpoint pointing at
   `https://<tunnel-host>/webhook`.
4. Copy its signing secret into `MXRAVEN_WEBHOOK_SECRET` and restart.

The server binds loopback only and disables the development banner
(`banner(false)`); use a hardened server behind a TLS-terminating proxy in
production. A listener that throws makes the server answer `500`, which makes
mxRaven retry the delivery.

## Feedback

`./gradlew run --args="feedback spam message.eml"` and the `ham`
variant submit the exact raw bytes mxRaven processed; the service matches them
against stored evidence by SHA-256. `feedback unsubscribe <token>` performs the
operation a mail client runs against a `List-Unsubscribe` URL. Failures surface
as `FeedbackException` with `statusCode()` and `retryable()`.

## Layout

```
build.gradle.kts        Gradle subproject definition
.env.example            copy to .env and fill in
README.md
src/main/java/com/mxraven/examples/plain/
  Main.java             command dispatcher
  Env.java              tiny .env loader
  SampleEmail.java      shared raw MIME fixture
  WelcomeTemplate.java  plain template renderer (no engine)
  examples/
    SendEmailExample.java
    SendTemplateExample.java
    SendAttachmentsExample.java
    SendDeliveryByExample.java
    SendRawExample.java
    FeedbackExample.java
    ParseInboundExample.java
    WebhookExample.java
    AllExample.java
```
