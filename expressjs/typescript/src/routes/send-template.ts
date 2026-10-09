import { Router, type Request, type Response } from "express";
import { Client, Message, SMTPError, type TemplateRenderer } from "@mxraven/mail";

export const sendTemplateRouter = Router();

/**
 * A plain template renderer. The SDK ships only the contract, so any object
 * with a `render` function works; no templating engine is required.
 */
const welcomeTemplate: TemplateRenderer<{ name: string }> = {
  render: ({ name }) => ({
    subject: `Welcome, ${name}`,
    html: `<h1>Welcome, ${name}!</h1><p>Sent from a plain template renderer.</p>`,
    text: `Welcome, ${name}!\n\nSent from a plain template renderer.`,
  }),
};

interface SendTemplateBody {
  to?: string;
  name?: string;
}

/**
 * POST /api/send-template
 *
 * Sends a message rendered from a plain template. The renderer's subject is
 * used when the message does not set one.
 */
sendTemplateRouter.post("/", async (req: Request, res: Response) => {
  const body = req.body as SendTemplateBody;
  const { to } = body;
  if (typeof to !== "string" || to.trim() === "") {
    res.status(400).json({ error: "`to` is required." });
    return;
  }
  const name = typeof body.name === "string" && body.name.trim() !== "" ? body.name : "there";

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
    .from(`Acme <${from}>`)
    .to(to)
    .render(welcomeTemplate, { name });

  try {
    const result = await client.send(message);
    res.json({ messageRef: result.messageRef, code: result.code });
  } catch (error) {
    if (error instanceof SMTPError) {
      res
        .status(error.permanent ? 502 : 503)
        .json({ error: error.message, code: error.code, permanent: error.permanent });
      return;
    }
    res.status(500).json({ error: error instanceof Error ? error.message : "Send failed." });
  } finally {
    await client.close();
  }
});
