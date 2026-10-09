import { Client, Message, SMTPError } from "@mxraven/mail";

interface SendEmailBody {
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
}

/**
 * POST /api/send-email
 *
 * Sends a plain-text message, or a `multipart/alternative` message when an
 * HTML body is supplied.
 *
 * curl -s localhost:3000/api/send-email -H 'Content-Type: application/json' \
 *   -d '{"to":"you@example.com","subject":"Hello","text":"Hi from mxRaven"}'
 */
export default defineEventHandler(async (event) => {
  let body: SendEmailBody;
  try {
    body = ((await readBody(event)) ?? {}) as SendEmailBody;
  } catch {
    setResponseStatus(event, 400);
    return { error: "Request body must be JSON." };
  }

  const { to } = body;
  if (typeof to !== "string" || to.trim() === "") {
    setResponseStatus(event, 400);
    return { error: "`to` is required." };
  }

  const host = process.env.MXRAVEN_HOST;
  const username = process.env.MXRAVEN_USERNAME;
  const secret = process.env.MXRAVEN_SECRET;
  if (host === undefined || username === undefined || secret === undefined) {
    setResponseStatus(event, 500);
    return { error: "Set MXRAVEN_HOST, MXRAVEN_USERNAME, and MXRAVEN_SECRET in .env." };
  }

  const client = new Client({
    host,
    port: Number(process.env.MXRAVEN_PORT ?? 587),
    username,
    secret,
  });

  const from = process.env.MXRAVEN_MAIL_FROM ?? "noreply@your-domain.example";
  const message = new Message()
    // `Name <address>` sets the display name on the From header.
    .from(`Acme <${from}>`)
    .to(to)
    .subject(body.subject ?? "Hello from mxRaven")
    .text(body.text ?? "This message was sent with @mxraven/mail.");

  // Setting both a text and an HTML body sends multipart/alternative,
  // which improves deliverability compared with HTML-only mail.
  if (typeof body.html === "string" && body.html !== "") {
    message.html(body.html);
  }

  try {
    const result = await client.send(message);
    return {
      messageRef: result.messageRef,
      code: result.code,
      recipients: result.recipients.map((recipient) => ({
        address: recipient.address,
        accepted: recipient.accepted,
      })),
    };
  } catch (error) {
    if (error instanceof SMTPError) {
      // 5xx failures are permanent; 4xx may succeed on retry.
      setResponseStatus(event, error.permanent ? 502 : 503);
      return {
        error: error.message,
        code: error.code,
        enhancedCode: error.enhancedCode,
        permanent: error.permanent,
      };
    }
    setResponseStatus(event, 500);
    return { error: error instanceof Error ? error.message : "Send failed." };
  } finally {
    // Always release the pooled connections.
    await client.close();
  }
});
