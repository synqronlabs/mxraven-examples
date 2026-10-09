import { Router, type Request, type Response } from "express";
import { Client, Message, SMTPError } from "@mxraven/mail";

export const sendDeliveryByRouter = Router();

interface SendDeliveryByBody {
  to?: string;
  seconds?: number;
  mode?: "N" | "R";
  envid?: string;
}

/**
 * POST /api/send-delivery-by
 *
 * Sends with RFC 2852 `DELIVERBY`, RFC 3461 DSN parameters, and extra MAIL
 * FROM parameters. The server must advertise `DELIVERBY` and DSN; `send` fails
 * before transfer when a requested extension is unsupported. Mode `R` also has
 * to meet the server's advertised minimum interval.
 */
sendDeliveryByRouter.post("/", async (req: Request, res: Response) => {
  const body = req.body as SendDeliveryByBody;
  const { to } = body;
  if (typeof to !== "string" || to.trim() === "") {
    res.status(400).json({ error: "`to` is required." });
    return;
  }

  const seconds = typeof body.seconds === "number" && body.seconds > 0 ? body.seconds : 3600;
  const mode = body.mode === "N" ? "N" : "R";
  const envid = body.envid ?? `express-${Date.now()}`;

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

  const message = new Message()
    .from(process.env.MXRAVEN_MAIL_FROM ?? "noreply@your-domain.example")
    .to(to)
    .subject("Delivery deadline example")
    .text(`This message asks mxRaven to apply a ${seconds}s DELIVERBY deadline (mode ${mode}).`);

  try {
    const result = await client.send(message, {
      // `N` requests a notification, `R` returns the message at the deadline.
      deliveryBy: { seconds, mode },
      // Ask for the full message on a DSN and tag the envelope for tracking.
      dsnRet: "FULL",
      envid,
      // `extensionParams` can add other MAIL FROM parameters, but servers
      // reject any parameter they do not advertise.
    });
    res.json({ messageRef: result.messageRef, code: result.code, seconds, mode, envid });
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
