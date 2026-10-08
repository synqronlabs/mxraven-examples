# mxRaven examples

Worked examples for [mxRaven](https://mxraven.com), the programmable email
platform: SMTP submission, inbound webhooks, MIME parsing, and React template
rendering. Each stack is a runnable app where every example is its own endpoint
or page, with an interactive demo and the code behind it.

## Stacks

| Stack | Path | Guide |
| --- | --- | --- |
| Next.js (TypeScript, App Router) | [`nextjs/typescript`](./nextjs/typescript) | [`README`](./nextjs/typescript/README.md) |

New stacks can be added alongside `nextjs/`, each keeping the same example set
and environment contract.

## Examples

The Next.js app covers:

| Example | Page | Source |
| --- | --- | --- |
| Send an email (text + HTML) | `/send-email` | `nextjs/typescript/app/api/send-email/route.ts` |
| React templates | `/send-react` | `nextjs/typescript/app/api/send-react/route.tsx` |
| Server action | `/server-action` | `nextjs/typescript/app/server-action/actions.tsx` |
| Attachments (file + inline `cid:`) | `/send-attachments` | `nextjs/typescript/app/api/send-attachments/route.ts` |
| Delivery deadlines and DSNs | `/send-delivery-by` | `nextjs/typescript/app/api/send-delivery-by/route.ts` |
| Raw messages | `/send-raw` | `nextjs/typescript/app/api/send-raw/route.ts` |
| Contact form | `/contact` | `nextjs/typescript/app/api/contact/route.tsx` |
| Webhooks (verify, dispatch, live feed) | `/webhooks` | `nextjs/typescript/app/api/webhook/route.ts` |
| Parse inbound mail | `/parse-inbound` | `nextjs/typescript/app/api/parse-inbound/route.ts` |

## Getting started

```bash
cd nextjs/typescript
bun install
cp .env.example .env   # fill in your mxRaven credentials
bun dev
```

Open http://localhost:3000 for the interactive walkthrough.

## Environment

The canonical example is [`.env.example`](./.env.example); each stack ships its
own copy next to its app. Copy it to `.env` in the stack you run.

| Variable | Purpose |
| --- | --- |
| `MXRAVEN_HOST` | SMTP submission host, e.g. `smtp.mxraven.email` |
| `MXRAVEN_PORT` | Submission port, defaults to `587` |
| `MXRAVEN_USERNAME` | Submission API key username, e.g. `mxr_tx_ab12cd34ef56` |
| `MXRAVEN_SECRET` | Submission API key secret |
| `MXRAVEN_WEBHOOK_SECRET` | Signing secret of the webhook endpoint |
| `MXRAVEN_MAIL_FROM` | Sender mailbox used by the examples |
| `MXRAVEN_CONTACT_TO` | Recipient of the contact form notification |

Never commit real credentials. `.env` files are ignored and only
`.env.example` is tracked.

## SDKs and docs

- [`@mxraven/mail`](https://www.npmjs.com/package/@mxraven/mail): JavaScript/TypeScript mail runtime SDK
- [`@mxraven/react`](https://www.npmjs.com/package/@mxraven/react): React template renderer for `@mxraven/mail`
- Documentation: https://mxraven.com/docs
