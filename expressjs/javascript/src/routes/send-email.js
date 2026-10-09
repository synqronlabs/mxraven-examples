import { Router } from "express";
import { Client, Message, SMTPError } from "@mxraven/mail";

export const sendEmailRouter = Router();

/**
 * POST /api/send-email
 *
 * Sends a plain-text message, or a `multipart/alternative` message when an
 * HTML body is supplied.
 */
sendEmailRouter.post("/", async (req, res) => {
  const body = req.body;
  const { to } = body;
  if (typeof to !== "string" || to.trim() === "") {
    res.status(400).json({ error: "`to` is required." });
    return;
  }

  const host = process.env.MXRAVEN_HOST;
  const username = process.env.MXRAVEN_USERNAME;
  const secret = process.env.MXRAVEN_SECRET;
  if (host === undefined || username === undefined || secret === undefined) {
    res
      .status(500)
      .json({ error: "Set MXRAVEN_HOST, MXRAVEN_USERNAME, and MXRAVEN_SECRET in .env." });
    return;
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
    res.json({
      messageRef: result.messageRef,
      code: result.code,
      recipients: result.recipients.map((recipient) => ({
        address: recipient.address,
        accepted: recipient.accepted,
      })),
    });
  } catch (error) {
    if (error instanceof SMTPError) {
      // 5xx failures are permanent; 4xx may succeed on retry.
      res.status(error.permanent ? 502 : 503).json({
        error: error.message,
        code: error.code,
        enhancedCode: error.enhancedCode,
        permanent: error.permanent,
      });
      return;
    }
    res.status(500).json({ error: error instanceof Error ? error.message : "Send failed." });
  } finally {
    // Always release the pooled connections.
    await client.close();
  }
});
