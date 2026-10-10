# mxRaven examples

Worked examples for [mxRaven](https://mxraven.com), the programmable email
platform: SMTP submission, inbound webhooks, MIME parsing, and React template
rendering. Each stack is a runnable app with every example implemented as its
own endpoint or page, a demo UI, and the code behind it.

## Stacks

| Stack | Languages |
| --- | --- |
| Next.js | [TypeScript](./nextjs/typescript) · [JavaScript](./nextjs/javascript) |
| Astro | [TypeScript](./astro/typescript) · [JavaScript](./astro/javascript) |
| Nuxt | [TypeScript](./nuxtjs/typescript) |
| Express | [TypeScript](./expressjs/typescript) · [JavaScript](./expressjs/javascript) |
| Bun | [TypeScript](./bun) |
| Node.js | [TypeScript](./node) |
| Java | [Plain](./java/plain) · [Spring Boot](./java/spring-boot) |
| Go | [CLI](./go/cli) · [Gin](./go/gin) |

## Getting started

```bash
cd nextjs/typescript
bun install
cp .env.example .env   # fill in your mxRaven credentials
bun dev
```

Open http://localhost:3000 for the interactive walkthrough. The stack guide
lists every example with its page and source file.

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
