import { Client, SMTPError } from "@mxraven/mail";

/** Serializes an RFC 5322 message. The caller is responsible for correctness. */
function rawMessage(from: string, to: string, subject: string, text: string): Uint8Array {
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@mxraven.example>`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "",
    text,
  ];
  return new TextEncoder().encode(message.join("\r\n"));
}

/** Streams a pre-serialized RFC 5322 message with an explicit envelope. */
export async function sendRaw(to: string): Promise<string> {
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
  const raw = rawMessage(from, to, "Raw message example", "These are pre-serialized RFC 5322 bytes.");

  try {
    const result = await client.sendRaw(
      {
        from,
        to: [{ address: to, notify: ["FAILURE", "DELAY"], orcpt: to }],
      },
      raw,
    );
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
    console.error("Usage: bun run send:raw <to>");
    process.exit(1);
  }
  await sendRaw(to);
}
