# mxRaven Node.js examples (TypeScript)

Plain Node.js scripts for every mxRaven mail action, plus a real webhook
listener. No framework, no build step: Node 22.18+ runs the TypeScript
directly with native type stripping, and `.env` is loaded with `--env-file`.

## Setup

```bash
npm install
cp .env.example .env   # fill in your mxRaven credentials
```

Requires Node.js 22.18 or later. Relative imports use explicit `.ts`
extensions, which Node's type stripping requires.

## Commands

| Command | What it does |
| --- | --- |
| `npm run send:email <to>` | Plain text plus an HTML alternative |
| `npm run send:template <to> [name]` | Rendered from a plain template renderer |
| `npm run send:attachments <to>` | File attachment and inline `cid:` image |
| `npm run send:delivery-by <to> [seconds] [N\|R] [envid]` | `DELIVERBY`, DSN, and extra MAIL FROM parameters |
| `npm run send:raw <to>` | Pre-serialized RFC 5322 bytes with per-recipient DSNs |
| `npm run feedback <spam\|ham> <file.eml>` | Trains the spam filter with exact raw bytes |
| `npm run feedback unsubscribe <token>` | RFC 8058 one-click unsubscribe |
| `npm run parse [file.eml]` | Parses MIME into headers, bodies, and attachments |
| `npm run webhook` | Starts the HTTP listener on port 3000 (`WEBHOOK_PORT`) |
| `npm run all <to>` | Runs every send example in sequence (`index.ts`) |
| `npm run typecheck` | `tsc --noEmit` |

```bash
npm run send:email you@example.com
npm run all you@example.com
```

Each script creates its own client from the environment and closes it in
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
| `WEBHOOK_PORT` | Listener port for `npm run webhook`, defaults to `3000` |

## Webhooks

`npm run webhook` starts a `node:http` server that verifies the
`X-MxRaven-Signature` HMAC, decodes the payload, and dispatches typed events:
`inbound_email` (downloads and parses the raw message), `delivery_status`, and
`s3_egress_status`.

1. Start the listener with `npm run webhook`.
2. Expose it publicly, e.g. `ngrok http 3000` or
   `cloudflared tunnel --url http://localhost:3000`.
3. In mxRaven, create a webhook endpoint pointing at
   `https://<tunnel-host>/webhook`.
4. Copy its signing secret into `MXRAVEN_WEBHOOK_SECRET` and restart.

The signature covers the request host and path, so the server rebuilds the
public URL from `X-Forwarded-Host` / `X-Forwarded-Proto` when present. A
listener that throws makes the server answer `500`, which makes mxRaven retry
the delivery.

## Feedback

`npm run feedback spam message.eml` and `npm run feedback ham message.eml`
submit the exact raw bytes mxRaven processed; the service matches them against
stored evidence by SHA-256. `npm run feedback unsubscribe <token>` performs the
operation a mail client runs against a `List-Unsubscribe` URL.

## Layout

```
index.ts                runs every send example (`npm run all <to>`)
src/
  examples/             one script per action (each is self-contained),
                        including webhook.ts (the node:http listener)
  lib/                  sample message fixture
```
