# mxRaven Astro examples (JavaScript)

An Astro project showing how to send and receive mail with
[`@mxraven/mail`](https://www.npmjs.com/package/@mxraven/mail) and
[`@mxraven/react`](https://www.npmjs.com/package/@mxraven/react). The
TypeScript version lives in [`../typescript`](../typescript).

## Setup

```bash
bun install
cp .env.example .env   # fill in your mxRaven credentials
bun dev
```

Open http://localhost:4321 for an interactive walkthrough. Every example has
its own page with a working demo and the code it runs.

## Environment

| Variable | Purpose |
| --- | --- |
| `MXRAVEN_HOST` | SMTP submission host, e.g. `smtp.mxraven.email` |
| `MXRAVEN_PORT` | Submission port, defaults to `587` |
| `MXRAVEN_USERNAME` | Submission API key username, e.g. `mxr_tx_ab12cd34ef56` |
| `MXRAVEN_SECRET` | Submission API key secret |
| `MXRAVEN_WEBHOOK_SECRET` | Signing secret of the webhook endpoint |
| `MXRAVEN_MAIL_FROM` | Sender mailbox used by the examples |
| `MXRAVEN_CONTACT_TO` | Recipient of the contact form notification |

Server code reads these from `import.meta.env` (Astro loads `.env` files).
The submission service requires STARTTLS and SMTP AUTH, so the SDK always uses
both.

## Examples index

| Example | Page | Source | Shows |
| --- | --- | --- | --- |
| Send an email | `/send-email` | `src/pages/api/send-email.js` | `Message` with `text` and optional `html` (`multipart/alternative`) |
| React templates | `/send-react` | `src/pages/api/send-react.js` | `.render(react(), createElement(WelcomeEmail))` |
| Server action | `/server-action` | `src/actions/index.js` | Astro action with `defineAction` and schema validation |
| Attachments | `/send-attachments` | `src/pages/api/send-attachments.js` | `attach` and `attachInline` with `cid:` |
| Delivery deadlines | `/send-delivery-by` | `src/pages/api/send-delivery-by.js` | `DELIVERBY`, `RET`, `ENVID` envelope parameters |
| Raw messages | `/send-raw` | `src/pages/api/send-raw.js` | `sendRaw` with serialized RFC 5322 bytes |
| Contact form | `/contact` | `src/pages/api/contact.js` | React-rendered notification with `Reply-To` |
| Signup OTP | `/signup` | `src/pages/api/signup/*.js` | One-time codes emailed with `@mxraven/mail` |
| Webhooks | `/webhooks` | `src/pages/api/webhook.js` | Signature verification, typed event dispatch, live feed |
| Parse inbound mail | `/parse-inbound` | `src/pages/api/parse-inbound.js` | `parseEmail` for headers, bodies, and attachments |

## Sending

All send endpoints accept JSON and return the server's `messageRef`. Every
endpoint creates its own client from the environment and closes it in
`finally`.

## Signup OTP

`POST /api/signup/request-otp` generates a 6-digit code with a CSPRNG, stores
only its SHA-256 hash in memory (10 minute TTL, 5 attempts), and emails the
code with `@mxraven/mail`. The code is never returned in the response; for
local testing it is printed to the server console. `POST
/api/signup/verify-otp` compares in constant time and consumes the code on
success. The in-memory store is for the demo only; production flows should use
a database or cache with rate limits. Try it at `/signup`.

```bash
curl -s localhost:4321/api/send-email \
  -H 'Content-Type: application/json' \
  -d '{"to":"you@example.com","subject":"Hello","text":"Hi from mxRaven"}'
```

`DELIVERBY` and DSN parameters require server support and fail before transfer
when unsupported. `SMTPError.permanent` (5xx) means do not retry;
`SMTPError.transient` (4xx) may succeed later.

## Receiving

### Webhooks

The app is the HTTP server, and `POST /api/webhook` is the listener. It
verifies the `X-MxRaven-Signature` HMAC, decodes the payload, and dispatches it
to the listeners in `src/pages/api/webhook.js`: `inbound_email` (downloads and
parses the raw message), `delivery_status`, and `s3_egress_status`. Deliveries
are recorded and shown live at `/webhooks`.

1. Run the app with `bun dev`.
2. Expose it publicly, e.g. `ngrok http 4321` or
   `cloudflared tunnel --url http://localhost:4321`.
3. In mxRaven, create a webhook endpoint pointing at
   `https://<tunnel-host>/api/webhook`.
4. Copy its signing secret into `MXRAVEN_WEBHOOK_SECRET` and restart.

The signature covers the request host and path, so the endpoint rebuilds the
public URL from `X-Forwarded-Host` / `X-Forwarded-Proto` when present. A
listener that throws makes the endpoint answer `500`, which makes mxRaven retry
the delivery.

### Parsing inbound mail

`POST /api/parse-inbound` decodes raw MIME bytes into headers, addresses,
bodies, and attachments:

```bash
curl -s localhost:4321/api/parse-inbound --data-binary @message.eml
```

The same parser is used on webhook payloads through `fetchAndParseRawEmail`.

## Layout

```
src/
  actions/              Astro action ("use server" equivalent)
  components/           ExamplePage and CodeBlock components
  emails/               React Email-style templates
  layouts/              base HTML layout
  lib/                  demo fixtures, client helpers, styles
  pages/
    api/                endpoints (send, webhook, parse, contact)
    index.astro         card grid of examples
    *.astro             example pages with their demo forms
```

Every endpoint is self-contained: it imports the SDK directly and creates its
own client, so each file can be copied on its own.
