import { Client, FeedbackError, disposition } from "@mxraven/mail/feedback";

/**
 * Teaches the spam filter with the exact raw message bytes mxRaven processed.
 * The service matches the bytes against stored evidence by SHA-256.
 */
export async function learn(label: "spam" | "ham", path: string): Promise<void> {
  const baseUrl = process.env.MXRAVEN_FEEDBACK_BASE_URL ?? "https://feedback.mxraven.com";
  const username = process.env.MXRAVEN_USERNAME;
  const secret = process.env.MXRAVEN_SECRET;
  if (username === undefined || secret === undefined) {
    throw new Error("Set MXRAVEN_USERNAME and MXRAVEN_SECRET in .env.");
  }

  const rawMime = new Uint8Array(await Bun.file(path).arrayBuffer());
  const client = new Client({ baseUrl, username, secret });

  try {
    const result = await client.learn(
      label === "spam" ? disposition.spam : disposition.ham,
      rawMime,
    );
    console.log(
      `Learned ${result.disposition} (tenant ${result.tenantId}, matched ${result.matchedHashKind})`,
    );
  } catch (error) {
    if (error instanceof FeedbackError) {
      console.error(`Feedback service returned ${error.statusCode}: ${error.detail}`);
    }
    throw error;
  }
}

/** Performs an RFC 8058 one-click unsubscribe for a signed token. */
export async function unsubscribe(token: string): Promise<void> {
  const baseUrl = process.env.MXRAVEN_FEEDBACK_BASE_URL ?? "https://feedback.mxraven.com";
  const client = new Client({ baseUrl });
  await client.unsubscribe(token);
  console.log("Unsubscribed.");
}

if (import.meta.main) {
  const [command, value] = process.argv.slice(2);

  if ((command === "spam" || command === "ham") && value !== undefined) {
    await learn(command, value);
  } else if (command === "unsubscribe" && value !== undefined) {
    await unsubscribe(value);
  } else {
    console.error("Usage: bun run feedback <spam|ham> <file.eml>");
    console.error("       bun run feedback unsubscribe <token>");
    process.exit(1);
  }
}
