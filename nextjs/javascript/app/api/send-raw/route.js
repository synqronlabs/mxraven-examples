import { Client, SMTPError } from "@mxraven/mail";

/** Serializes an RFC 5322 message. The caller is responsible for correctness. */
function rawMessage(from, to, subject, text) {
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

/**
 * POST /api/send-raw
 *
 * Streams an already serialized RFC 5322 message with an explicit envelope.
 * Use this for large or pre-rendered messages; the SDK does not parse the data.
 * The envelope can carry per-recipient DSN options.
 *
 * curl -s localhost:3000/api/send-raw -H 'Content-Type: application/json' \
 *   -d '{"to":"you@example.com"}'
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const { to } = body;
  if (typeof to !== "string" || to.trim() === "") {
    return Response.json({ error: "`to` is required." }, { status: 400 });
  }

  const host = process.env.MXRAVEN_HOST;
  const username = process.env.MXRAVEN_USERNAME;
  const secret = process.env.MXRAVEN_SECRET;
  if (host === undefined || username === undefined || secret === undefined) {
    return Response.json(
      { error: "Set MXRAVEN_HOST, MXRAVEN_USERNAME, and MXRAVEN_SECRET in .env." },
      { status: 500 },
    );
  }

  const client = new Client({
    host,
    port: Number(process.env.MXRAVEN_PORT ?? 587),
    username,
    secret,
  });

  const from = process.env.MXRAVEN_MAIL_FROM ?? "noreply@your-domain.example";
  const raw = rawMessage(
    from,
    to,
    body.subject ?? "Raw message example",
    body.text ?? "These are pre-serialized RFC 5322 bytes.",
  );

  try {
    const result = await client.sendRaw(
      {
        from,
        to: [{ address: to, notify: ["FAILURE", "DELAY"], orcpt: to }],
      },
      raw,
    );

    return Response.json({ messageRef: result.messageRef, code: result.code });
  } catch (error) {
    if (error instanceof SMTPError) {
      return Response.json(
        { error: error.message, code: error.code, permanent: error.permanent },
        { status: error.permanent ? 502 : 503 },
      );
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Send failed." },
      { status: 500 },
    );
  } finally {
    await client.close();
  }
}
