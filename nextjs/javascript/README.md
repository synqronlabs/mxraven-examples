# mxRaven Next.js examples (JavaScript)

A Next.js App Router project showing how to send and receive mail with
[`@mxraven/mail`](https://www.npmjs.com/package/@mxraven/mail) and
[`@mxraven/react`](https://www.npmjs.com/package/@mxraven/react), in plain
JavaScript. The TypeScript version lives in
[`../typescript`](../typescript).

## Setup

```bash
bun install
cp .env.example .env   # fill in your mxRaven credentials
bun dev
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
| `MXRAVEN_CONTACT_TO` | Recipient of the contact form notification |

The submission service requires STARTTLS and SMTP AUTH, so the SDK always uses
both. Secrets are read at request time; nothing is evaluated at build time.

## Examples index

| Example | Page | Source | Shows |
| --- | --- | --- | --- |
| Send an email | `/send-email` | `app/api/send-email/route.js` | `Message` with `text` and optional `html` (`multipart/alternative`) |
| React templates | `/send-react` | `app/api/send-react/route.jsx` | `.render(react(), <WelcomeEmail />)` |
| Server action | `/server-action` | `app/server-action/actions.jsx` | `"use server"` action with `useActionState` |
| Attachments | `/send-attachments` | `app/api/send-attachments/route.js` | `attach` and `attachInline` with `cid:` |
| Delivery deadlines | `/send-delivery-by` | `app/api/send-delivery-by/route.js` | `DELIVERBY`, `RET`, `ENVID` envelope parameters |
| Raw messages | `/send-raw` | `app/api/send-raw/route.js` | `sendRaw` with serialized RFC 5322 bytes |
| Contact form | `/contact` | `app/api/contact/route.jsx` | React-rendered notification with `Reply-To` |
| Webhooks | `/webhooks` | `app/api/webhook/route.js` | Signature verification, typed event dispatch, live feed |
| Parse inbound mail | `/parse-inbound` | `app/api/parse-inbound/route.js` | `parseEmail` for headers, bodies, and attachments |

## Sending

All send endpoints accept JSON and return the server's `messageRef`. Every
route creates its own client from the environment and closes it in `finally`.

```bash
curl -s localhost:3000/api/send-email \
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
to the listeners in `app/api/webhook/route.js`: `inbound_email` (downloads and
parses the raw message), `delivery_status`, and `s3_egress_status`. Deliveries
are recorded and shown live at `/webhooks`.

1. Run the app with `bun dev`.
2. Expose it publicly, e.g. `ngrok http 3000` or
   `cloudflared tunnel --url http://localhost:3000`.
3. In mxRaven, create a webhook endpoint pointing at
   `https://<tunnel-host>/api/webhook`.
4. Copy its signing secret into `MXRAVEN_WEBHOOK_SECRET` and restart.

The signature covers the request host and path, so the route rebuilds the
public URL from `X-Forwarded-Host` / `X-Forwarded-Proto` when present. A
listener that throws makes the route answer `500`, which makes mxRaven retry
the delivery.

### Parsing inbound mail

`POST /api/parse-inbound` decodes raw MIME bytes into headers, addresses,
bodies, and attachments:

```bash
curl -s localhost:3000/api/parse-inbound --data-binary @message.eml
```

The same parser is used on webhook payloads through `fetchAndParseRawEmail`.

## Layout

```
app/
  api/
    send-email/         plain + HTML submission
    send-react/         React template submission
    send-attachments/   file + inline attachments
    send-delivery-by/   DELIVERBY and DSN envelope options
    send-raw/           pre-serialized RFC 5322 bytes
    webhook/            signature verification + event dispatch
    webhook/events/     recent deliveries for the live feed
    parse-inbound/      MIME parsing
    contact/            contact form handler
  send-email/           example pages with their demo forms
  send-react/
  send-attachments/
  send-delivery-by/
  send-raw/
  server-action/        "use server" action + useActionState form
  webhooks/             live feed page
  parse-inbound/        MIME parsing page
  contact/              contact form page
emails/                 React Email-style templates
lib/                    demo fixtures only (event log, sample message)
```

Every route handler is self-contained: it imports the SDK directly and creates
its own client, so each file can be copied on its own.
