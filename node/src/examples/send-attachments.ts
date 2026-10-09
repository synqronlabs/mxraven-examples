import { Client, Message, SMTPError } from "@mxraven/mail";

/** A 1x1 placeholder PNG; replace it with your own image bytes. */
const logoPng = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (character) => character.charCodeAt(0),
);

/** Sends a message with a file attachment and an inline image. */
export async function sendAttachments(to: string): Promise<string> {
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

  const report = new TextEncoder().encode("id,name\n1,Ada Lovelace\n2,Alan Turing\n");
  const message = new Message()
    .from(process.env.MXRAVEN_MAIL_FROM ?? "noreply@your-domain.example")
    .to(to)
    .subject("Your report")
    .text("Your report is attached.")
    .html('<p>Your report is attached.</p><p><img src="cid:logo" alt="Acme logo" /></p>')
    .attach({ filename: "report.csv", contentType: "text/csv", data: report })
    .attachInline("logo.png", "logo", logoPng);

  try {
    const result = await client.send(message);
    console.log(`Accepted as ${result.messageRef} (2 attachments)`);
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
    console.error("Usage: bun run send:attachments <to>");
    process.exit(1);
  }
  await sendAttachments(to);
}
