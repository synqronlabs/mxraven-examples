import { Router, type Request, type Response } from "express";
import { parseEmail } from "@mxraven/mail/mime";

export const parseInboundRouter = Router();

/**
 * POST /api/parse-inbound
 *
 * Parses raw RFC 5322 / MIME bytes into headers, addresses, bodies, and
 * attachments. Send the message as the request body.
 *
 * curl -s localhost:3000/api/parse-inbound --data-binary @message.eml
 */
parseInboundRouter.post("/", (req: Request, res: Response) => {
  const bytes = req.body as Buffer;
  if (!Buffer.isBuffer(bytes) || bytes.byteLength === 0) {
    res.status(400).json({ error: "POST the raw RFC 5322 message as the request body." });
    return;
  }

  try {
    const email = parseEmail(bytes);
    res.json({
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
    res
      .status(422)
      .json({ error: error instanceof Error ? error.message : "Could not parse the message." });
  }
});
