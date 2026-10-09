# mxRaven Nuxt examples (TypeScript)

A Nuxt 4 app showing how to send and receive mail with
[`@mxraven/mail`](https://www.npmjs.com/package/@mxraven/mail) and
[`@mxraven/vue`](https://www.npmjs.com/package/@mxraven/vue). The JavaScript
version lives in [`../javascript`](../javascript).

## Setup

```bash
bun install
cp .env.example .env   # fill in your mxRaven credentials
bun run dev
```

Open http://localhost:3000 for an interactive walkthrough. Every example has
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

Server routes read these from `process.env` (Nuxt loads `.env` in dev). The
submission service requires STARTTLS and SMTP AUTH, so the SDK always uses
both.

## Examples index

| Example | Page | Source | Shows |
| --- | --- | --- | --- |
| Send an email | `/send-email` | `server/api/send-email.post.ts` | `Message` with `text` and optional `html` (`multipart/alternative`) |
| Vue templates | `/send-template` | `server/api/send-template.post.ts` | `.render(vue(), h(Welcome))` with a shared SFC |
| Attachments | `/send-attachments` | `server/api/send-attachments.post.ts` | `attach` and `attachInline` with `cid:` |
| Delivery deadlines | `/send-delivery-by` | `server/api/send-delivery-by.post.ts` | `DELIVERBY` and DSN envelope parameters |
| Raw messages | `/send-raw` | `server/api/send-raw.post.ts` | `sendRaw` with serialized RFC 5322 bytes |
| Signup OTP | `/signup` | `server/api/signup/*.post.ts` | One-time codes emailed with `@mxraven/mail` |
| Webhooks | `/webhooks` | `server/api/webhook.post.ts` | Signature verification, typed event dispatch, live feed |
| Parse inbound mail | `/parse-inbound` | `server/api/parse-inbound.post.ts` | `parseEmail` for headers, bodies, and attachments |

## Vue templates

Nitro bundles server routes with Rollup, which does not understand `.vue`
files. `nuxt.config.ts` adds `@vitejs/plugin-vue` to `nitro.rollupConfig`, so
server routes can import single-file components. The email template lives at
`shared/emails/Welcome.vue` and is imported by both the route (rendered with
`vue()` and `h(Welcome, props)`) and the page preview.

```bash
curl -s localhost:3000/api/send-template \
  -H 'Content-Type: application/json' \
  -d '{"to":"you@example.com","name":"Ada"}'
```

## Signup OTP

`POST /api/signup/request-otp` generates a 6-digit code with a CSPRNG, stores
only its SHA-256 hash in memory (10 minute TTL, 5 attempts), and emails the
code with `@mxraven/mail`. The code is never returned in the response; for
local testing it is printed to the server console. `POST
/api/signup/verify-otp` compares in constant time and consumes the code on
success. The in-memory store is for the demo only; production flows should use
a database or cache with rate limits.

## Webhooks

The app is the HTTP server, and `POST /api/webhook` is the listener. It
verifies the `X-MxRaven-Signature` HMAC, decodes the payload, and dispatches
typed events: `inbound_email` (downloads and parses the raw message),
`delivery_status`, and `s3_egress_status`. Deliveries are recorded and shown
live at `/webhooks`.

1. Run the app with `bun run dev`.
2. Expose it publicly, e.g. `ngrok http 3000` or
   `cloudflared tunnel --url http://localhost:3000`.
3. In mxRaven, create a webhook endpoint pointing at
   `https://<tunnel-host>/api/webhook`.
4. Copy its signing secret into `MXRAVEN_WEBHOOK_SECRET` and restart.

The signature covers the request host and path, so the route rebuilds the
public URL from `X-Forwarded-Host` / `X-Forwarded-Proto` when present. A
listener that throws makes the route answer `500`, which makes mxRaven retry
the delivery.

## Commands

```bash
bun run dev        # dev server
bun run build      # production build
bun run typecheck  # vue-tsc
```

## Layout

```
shared/                 code shared by app and server (email SFC, fixtures)
server/
  api/                  one self-contained handler per example
  lib/                  demo fixtures (event log, OTP store)
app/
  components/           ExamplePage, CodeBlock, ResultPanel
  composables/          useExampleRequest
  pages/                example pages with their demo forms
```

Every route handler is self-contained: it imports the SDK directly and creates
its own client, so each file can be copied on its own.
