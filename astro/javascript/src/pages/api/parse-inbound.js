import { parseEmail } from "@mxraven/mail/mime";

/**
 * POST /api/parse-inbound
 *
 * Parses raw RFC 5322 / MIME bytes into headers, addresses, bodies, and
 * attachments. The same parser runs on downloaded webhook payloads through
 * `fetchAndParseRawEmail` (see `src/pages/api/webhook.js`).
 *
 * curl -s localhost:4321/api/parse-inbound --data-binary @message.eml
 */
export const POST = async ({ request }) => {
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0) {
    return Response.json(
      { error: "POST the raw RFC 5322 message as the request body." },
      { status: 400 },
    );
  }

  try {
    const email = parseEmail(bytes);
    return Response.json({
      subject: email.subject,
      from: email.from,
      to: email.to,
      cc: email.cc,
      messageId: email.messageId,
      date: email.date?.toISOString(),
      text: email.text,
      html: email.html,
      attachments: email.attachments.map((attachment) => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        inline: attachment.inline,
        size: attachment.content.byteLength,
      })),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not parse the message." },
      { status: 422 },
    );
  }
};
