# Contributing to mxRaven examples

Thanks for taking the time to contribute. This repository collects runnable
mxRaven examples for every supported stack. This guide covers how to report
issues, add an example or a stack, and get a pull request merged.

## Ways to contribute

- **Report a bug** in an example by opening an issue.
- **Request a new example** or a new stack.
- **Improve documentation** in the READMEs or the example comments.
- **Send a pull request** for a fix, a new example, or a new stack.

Please be respectful and constructive in issues, reviews, and discussions.

## Repository layout

Each stack lives in its own top-level directory, with one subdirectory per
language flavor:

| Stack | Paths | Checks |
| --- | --- | --- |
| Next.js | `nextjs/typescript`, `nextjs/javascript` | `bun install && bun run lint && bun run build` |
| Astro | `astro/typescript`, `astro/javascript` | `bun install && bun run build` |
| Nuxt | `nuxtjs/typescript` | `bun install && bun run build && bun run typecheck` |
| Express | `expressjs/typescript`, `expressjs/javascript` | `npm install`, `npm run typecheck` (TypeScript), `npm start` |
| Bun | `bun` | `bun install && bun run typecheck` |
| Node.js | `node` | `npm install && npm run typecheck` |
| Java | `java/plain`, `java/spring-boot` | `./gradlew build` in each project |
| Go | `go/cli`, `go/gin` | `go vet ./... && go build ./...` in each module |

## The shared example set

Examples are named identically across stacks so they are easy to compare:

| Example | Purpose |
| --- | --- |
| `send-email` | Plain text plus an optional HTML alternative |
| `send-template` | Rendered from a template (React, Vue, Go templates, or plain code) |
| `send-attachments` | A file attachment plus an inline `cid:` image |
| `send-delivery-by` | `DELIVERBY` with mode `N` or `R` (default `R`) |
| `send-raw` | A pre-serialized RFC 5322 message |
| `feedback` | Spam/ham training and one-click unsubscribe |
| `signup-otp` | A one-time signup code emailed with the SDK |
| `webhook` | Signature verification, typed dispatch, and a recent-events feed |
| `parse-inbound` | MIME parsing, only where the SDK ships a parser (JS and Java) |

HTTP stacks use the same endpoint paths (`/api/send-email`, `/api/webhook`, and
so on); CLI stacks use the same command names.

## Adding an example

1. Add it to every stack that can support it, using the shared name above.
2. Keep each endpoint, handler, or command self-contained: import the SDK
   directly, create the client inside the request or command, and close it
   (`finally`, `defer`, try-with-resources) before returning.
3. Use the environment contract below; never hardcode credentials.
4. Add the example to the stack README and to the root README index if it is a
   new category.
5. Run the stack's checks from the table above and a smoke test with a dummy
   `.env`.

## Adding a stack

1. Create `<stack>/<flavor>` following the layout of an existing stack of the
   same shape (for example `expressjs/typescript` for an API, `go/cli` for a
   CLI).
2. Implement the shared example set that the SDK supports.
3. Add a `.env.example`, a `.gitignore` that ignores `.env`, and a README with
   the same sections as the other stacks.
4. Add the stack to the root README index.
5. Add a CI workflow under `.github/workflows/` if the stack can build without
   credentials.

## Environment contract

Every stack reads the same variables and ships a `.env.example`:

| Variable | Purpose |
| --- | --- |
| `MXRAVEN_HOST` | SMTP submission host |
| `MXRAVEN_PORT` | Submission port, defaults to `587` |
| `MXRAVEN_USERNAME` | Submission API key username |
| `MXRAVEN_SECRET` | Submission API key secret |
| `MXRAVEN_WEBHOOK_SECRET` | Webhook endpoint signing secret |
| `MXRAVEN_MAIL_FROM` | Sender mailbox, a bare address or `Name <address>` |
| `MXRAVEN_FEEDBACK_BASE_URL` | Feedback service URL |
| `PORT` / `WEBHOOK_PORT` | HTTP or listener port where relevant |

Never commit a real `.env`, token, or credential. Use a dummy `.env` for local
smoke tests (`MXRAVEN_HOST=127.0.0.1`, `MXRAVEN_PORT=1`) and expect a
connection-refused error, which proves the example reached the SDK.

## Style

- Keep examples short and readable; a reader should be able to copy one file.
- Prefer clear names over clever code, and comment the SDK calls that matter.
- Match the formatting already used in the stack (`gofmt`, `gofmt`-style
  formatting in Go, the Gradle setup in Java, `bun run lint`/`eslint` in the JS
  stacks).
- Avoid em dashes in user-facing strings and documentation.

## Commit messages

Use a type prefix so the history stays readable:

| Prefix | Use for |
| --- | --- |
| `feat` | A new example or stack |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `refactor` | A change that neither fixes a bug nor adds a feature |
| `build` | Build system or dependencies |
| `ci` | CI configuration |
| `chore` | Maintenance tasks |

Add a scope where it helps, for example `feat(go): ...` or
`fix(nextjs): ...`.

## Pull requests

Before opening a pull request, confirm:

- [ ] The stack's checks from the table above pass.
- [ ] A dummy-`.env` smoke test reaches the SDK for every new example.
- [ ] The stack README and the root README index are updated.
- [ ] No real credentials, tokens, or `.env` files are included.
- [ ] The change is focused on a single concern.

In the description, explain what the change does and why, and link the related
issue. A maintainer will review and may request changes; please be responsive to
feedback.

## License

By contributing, you agree that your contributions are licensed under the
[Apache License 2.0](./LICENSE), and you confirm you have the right to submit
them.
