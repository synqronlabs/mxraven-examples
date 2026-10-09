import { Client, Message, SMTPError } from "@mxraven/mail";

/** Sends a plain-text message with an HTML alternative. */
export async function sendEmail(to: string): Promise<string> {
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
    .subject("Hello from Bun")
    .text("This message was sent from a Bun script with @mxraven/mail.")
    .html(
      "<p>This message was sent from a <strong>Bun</strong> script with <code>@mxraven/mail</code>.</p>",
    );

  try {
    const result = await client.send(message);
    console.log(`Accepted as ${result.messageRef}`);
    return result.messageRef;
  } catch (error) {
    if (error instanceof SMTPError) {
      console.error(`Rejected: ${error.code} ${error.message}`);
    }
    throw error;
  } finally {
    await client.close();
  }
}

if (import.meta.main) {
  const to = process.argv[2];
  if (to === undefined || to === "") {
    console.error("Usage: bun run send:email <to>");
    process.exit(1);
  }
  await sendEmail(to);
}
