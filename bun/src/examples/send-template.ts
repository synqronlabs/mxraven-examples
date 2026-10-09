import { Client, Message, type TemplateRenderer } from "@mxraven/mail";

/**
 * A plain template renderer. The SDK ships only the contract, so any object
 * with a `render` function works; no templating engine is required.
 */
const welcomeTemplate: TemplateRenderer<{ name: string }> = {
  render: ({ name }) => ({
    subject: `Welcome, ${name}`,
    html: `<h1>Welcome, ${name}!</h1><p>Sent from a plain template renderer.</p>`,
    text: `Welcome, ${name}!\n\nSent from a plain template renderer.`,
  }),
};

/** Sends a message rendered from a plain template. */
export async function sendTemplate(to: string, name = "Ada"): Promise<string> {
  const host = process.env.MXRAVEN_HOST;
  const username = process.env.MXRAVEN_USERNAME;
  const secret = process.env.MXRAVEN_SECRET;
  if (host === undefined || username === undefined || secret === undefined) {
    throw new Error("Set MXRAVEN_HOST, MXRAVEN_USERNAME, and MXRAVEN_SECRET in .env.");
  }

  const client = new Client({
    host,
    port: Number(process.env.MXRAVEN_PORT ?? 587),
    username,
    secret,
  });

  const from = process.env.MXRAVEN_MAIL_FROM ?? "noreply@your-domain.example";
  const message = new Message()
    .from(`Acme <${from}>`)
    .to(to)
    // The renderer runs inside send(); its subject is used when none is set.
    .render(welcomeTemplate, { name });

  try {
    const result = await client.send(message);
    console.log(`Accepted as ${result.messageRef}`);
    return result.messageRef;
  } finally {
    await client.close();
  }
}

if (import.meta.main) {
  const to = process.argv[2];
  if (to === undefined || to === "") {
    console.error("Usage: bun run send:template <to> [name]");
    process.exit(1);
  }
  await sendTemplate(to, process.argv[3] ?? "Ada");
}
