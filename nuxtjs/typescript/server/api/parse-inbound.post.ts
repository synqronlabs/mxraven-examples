import { parseEmail } from "@mxraven/mail/mime";

/**
 * POST /api/parse-inbound
 *
 * Parses raw RFC 5322 / MIME bytes into headers, addresses, bodies, and
 * attachments. The same parser runs on downloaded webhook payloads through
 * `fetchAndParseRawEmail` (see `server/api/webhook.post.ts`).
 *
 * curl -s localhost:3000/api/parse-inbound --data-binary @message.eml
 */
export default defineEventHandler(async (event) => {
  const raw = await readRawBody(event, false);
  const bytes = raw === undefined ? new Uint8Array(0) : new Uint8Array(raw);
  if (bytes.byteLength === 0) {
    setResponseStatus(event, 400);
    return { error: "POST the raw RFC 5322 message as the request body." };
  }

  try {
    const email = parseEmail(bytes);
    return {
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
    };
  } catch (error) {
    setResponseStatus(event, 422);
    return { error: error instanceof Error ? error.message : "Could not parse the message." };
  }
});
