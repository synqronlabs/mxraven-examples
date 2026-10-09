import { Router } from "express";
import { fetchAndParseRawEmail } from "@mxraven/mail/mime";
import { WebhookHandler, eventType } from "@mxraven/mail/webhook";
import { listRecentEvents, recordEvent } from "../lib/events.js";

export const webhookRouter = Router();

/**
 * `inbound_email` fires for every message routed to a webhook endpoint. The
 * payload only references the raw message, so download and parse it when the
 * body or attachments are needed. Never log `raw_email.access_token`.
 */
async function onInboundEmail(email) {
  console.log(
    `[inbound_email] task=${email.task_id} from=${email.message.from?.join(", ") ?? "(unknown)"} subject=${email.message.subject ?? "(none)"}`,
  );
  const parsed = await fetchAndParseRawEmail(email.raw_email);
  console.log(
    `[inbound_email] parsed subject="${parsed.subject ?? ""}" attachments=${parsed.attachments.length}`,
  );
  recordEvent(
    "inbound_email",
    `"${parsed.subject ?? "(no subject)"}" from ${email.message.from?.join(", ") ?? "unknown"} · ${parsed.attachments.length} attachment(s)`,
  );
}

/** `delivery_status` reports the outcome of every outbound delivery attempt. */
function onDeliveryStatus(status) {
  console.log(
    `[delivery_status] task=${status.task_id} status=${status.status} smtp=${status.smtp_code ?? "-"} ${status.enhanced_status_code ?? ""}`,
  );
  recordEvent("delivery_status", `${status.status} · task=${status.task_id}`);
}

/** `s3_egress_status` reports an object-storage write initiated by a routing rule. */
function onStorageStatus(status) {
  console.log(
    `[s3_egress_status] task=${status.task_id ?? "-"} status=${status.status} object=${status.object_key ?? "-"}`,
  );
  recordEvent("s3_egress_status", `${status.status} · object=${status.object_key ?? "-"}`);
}

let handler;

function webhookHandler() {
  if (handler === undefined) {
    const secret = process.env.MXRAVEN_WEBHOOK_SECRET;
    if (secret === undefined || secret === "") {
      throw new Error("Set MXRAVEN_WEBHOOK_SECRET in .env.");
    }
    handler = new WebhookHandler({ secret })
      .on(eventType.inboundEmail, onInboundEmail)
      .on(eventType.deliveryStatus, onDeliveryStatus)
      .on(eventType.storageStatus, onStorageStatus);
  }
  return handler;
}

/**
 * POST /api/webhook
 *
 * Receives mxRaven webhook deliveries. The handler verifies the signature,
 * decodes the payload, and dispatches it to the listeners above. The response
 * status tells mxRaven what to do: `204` acknowledged, `401` bad signature,
 * `400` malformed, `500` retry later.
 *
 * The route is mounted with `express.raw()`, so `req.body` is the exact byte
 * buffer the signature covers.
 */
webhookRouter.post("/", async (req, res) => {
  try {
    const response = await webhookHandler().handle({
      method: req.method,
      // `trust proxy` makes protocol and host reflect forwarded headers.
      url: `${req.protocol}://${req.get("host") ?? "localhost"}${req.originalUrl}`,
      headers: req.headers,
      body: new Uint8Array(req.body),
    });
    res.status(response.status).end();
  } catch (error) {
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : "Webhook handling failed." });
  }
});

/**
 * GET /api/webhook/events
 *
 * Returns the recent webhook events recorded by the listeners, newest first.
 */
webhookRouter.get("/events", (_req, res) => {
  res.json(listRecentEvents());
});
