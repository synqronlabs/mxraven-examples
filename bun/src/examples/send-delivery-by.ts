import { Client, Message, SMTPError } from "@mxraven/mail";

/** Sends with RFC 2852 DELIVERBY and RFC 3461 DSN envelope parameters. */
export async function sendDeliveryBy(
  to: string,
  seconds = 3600,
  mode: "N" | "R" = "R",
  envid = `bun-${Date.now()}`,
): Promise<string> {
  const host = process.env.MXRAVEN_HOST;
  const username = process.env.MXRAVEN_USERNAME;
  const secret = process.env.MXRAVEN_SECRET;
  if (host === undefined || username === undefined || secret === undefined) {
    throw new Error("Set MXRAVEN_HOST, MXRAVEN_USERNAME, and MXRAVEN_SECRET in .env.");
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
      // Extra MAIL FROM parameters are passed through verbatim.
      extensionParams: new Map([["X-CUSTOM", "bun-example"]]),
    });
    console.log(`Accepted as ${result.messageRef} (envid ${envid})`);
    return result.messageRef;
  } catch (error) {
    if (error instanceof SMTPError) {
      console.error(`Rejected: ${error.code} ${error.message}`);
    }
    throw error;
  } finally {
    await client.close();
  }
}

if (import.meta.main) {
  const to = process.argv[2];
  if (to === undefined || to === "") {
    console.error("Usage: bun run send:delivery-by <to> [seconds] [N|R] [envid]");
    process.exit(1);
  }
  const seconds = Number(process.argv[3] ?? 3600);
  const mode = process.argv[4] === "N" ? "N" : "R";
  const envid = process.argv[5] ?? `bun-${Date.now()}`;
  await sendDeliveryBy(to, seconds, mode, envid);
}
