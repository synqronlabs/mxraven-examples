import { Client, Message, SMTPError } from "@mxraven/mail";

/**
 * POST /api/send-delivery-by
 *
 * Sends with RFC 2852 `DELIVERBY` and RFC 3461 DSN envelope parameters. The
 * server must advertise `DELIVERBY` and DSN; `send` fails before transfer when
 * a requested extension is unsupported. Mode `R` also has to meet the server's
 * advertised minimum interval.
 *
 * curl -s localhost:4321/api/send-delivery-by -H 'Content-Type: application/json' \
 *   -d '{"to":"you@example.com","seconds":3600,"mode":"R","envid":"order-42"}'
 */
export const POST = async ({ request }) => {
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

  const seconds = typeof body.seconds === "number" && body.seconds > 0 ? body.seconds : 3600;
  const mode = body.mode === "N" ? "N" : "R";
  const envid = body.envid ?? `example-${Date.now()}`;

  const host = import.meta.env.MXRAVEN_HOST;
  const username = import.meta.env.MXRAVEN_USERNAME;
  const secret = import.meta.env.MXRAVEN_SECRET;
  if (host === undefined || username === undefined || secret === undefined) {
    return Response.json(
      { error: "Set MXRAVEN_HOST, MXRAVEN_USERNAME, and MXRAVEN_SECRET in .env." },
      { status: 500 },
    );
  }

  const client = new Client({
    host,
    port: Number(import.meta.env.MXRAVEN_PORT ?? 587),
    username,
    secret,
  });

  const message = new Message()
    .from(import.meta.env.MXRAVEN_MAIL_FROM ?? "noreply@your-domain.example")
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
    });

    return Response.json({
      messageRef: result.messageRef,
      code: result.code,
      seconds,
      mode,
      envid,
    });
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
};
