import { Client, Message, SMTPError } from "@mxraven/mail";

interface SendDeliveryByBody {
  to?: string;
  seconds?: number;
  mode?: "N" | "R";
  envid?: string;
}

/**
 * POST /api/send-delivery-by
 *
 * Sends with RFC 2852 `DELIVERBY` and RFC 3461 DSN envelope parameters. The
 * server must advertise `DELIVERBY` and DSN; `send` fails before transfer when
 * a requested extension is unsupported. Mode `R` also has to meet the server's
 * advertised minimum interval.
 *
 * curl -s localhost:3000/api/send-delivery-by -H 'Content-Type: application/json' \
 *   -d '{"to":"you@example.com","seconds":3600,"mode":"R","envid":"order-42"}'
 */
export default defineEventHandler(async (event) => {
  let body: SendDeliveryByBody;
  try {
    body = ((await readBody(event)) ?? {}) as SendDeliveryByBody;
  } catch {
    setResponseStatus(event, 400);
    return { error: "Request body must be JSON." };
  }

  const { to } = body;
  if (typeof to !== "string" || to.trim() === "") {
    setResponseStatus(event, 400);
    return { error: "`to` is required." };
  }

  const seconds = typeof body.seconds === "number" && body.seconds > 0 ? body.seconds : 3600;
  const mode = body.mode === "N" ? "N" : "R";
  const envid = body.envid ?? `example-${Date.now()}`;

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

  const message = new Message()
    .from(process.env.MXRAVEN_MAIL_FROM ?? "noreply@your-domain.example")
    .to(to)
    .subject("Delivery deadline example")
    .text(`This message asks mxRaven to apply a ${seconds}s DELIVERBY deadline (mode ${mode}).`);

  try {
    const result = await client.send(message, {
      // `N` requests a notification, `R` returns the message when the deadline passes.
      deliveryBy: { seconds, mode },
      // Ask for the full message on a DSN and tag the envelope for tracking.
      dsnRet: "FULL",
      envid,
      // Do not reach for `extensionParams` to add custom X- parameters here:
      // servers reject any MAIL FROM parameter they do not advertise, with a
      // 555 response.
    });

    return {
      messageRef: result.messageRef,
      code: result.code,
      seconds,
      mode,
      envid,
    };
  } catch (error) {
    if (error instanceof SMTPError) {
      setResponseStatus(event, error.permanent ? 502 : 503);
      return { error: error.message, code: error.code, permanent: error.permanent };
    }
    setResponseStatus(event, 500);
    return { error: error instanceof Error ? error.message : "Send failed." };
  } finally {
    await client.close();
  }
});
