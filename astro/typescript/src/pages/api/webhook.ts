import type { APIRoute } from "astro";
import { fetchAndParseRawEmail } from "@mxraven/mail/mime";
import {
  WebhookHandler,
  eventType,
  type DeliveryStatus,
  type InboundEmail,
  type StorageStatus,
} from "@mxraven/mail/webhook";
import { recordEvent } from "../../lib/events";

/**
 * `inbound_email` fires for every message routed to a webhook endpoint.
 *
 * The payload carries only a reference to the raw message, so download and
 * parse it when the body or attachments are needed. Never log
 * `email.raw_email.access_token`; it is a short-lived secret.
 */
async function onInboundEmail(email: InboundEmail): Promise<void> {
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
function onDeliveryStatus(status: DeliveryStatus): void {
  console.log(
    `[delivery_status] task=${status.task_id} status=${status.status} smtp=${status.smtp_code ?? "-"} ${status.enhanced_status_code ?? ""}`,
  );
  recordEvent("delivery_status", `${status.status} · task=${status.task_id}`);
}

/** `s3_egress_status` reports an object-storage write initiated by a routing rule. */
function onStorageStatus(status: StorageStatus): void {
  console.log(
    `[s3_egress_status] task=${status.task_id ?? "-"} status=${status.status} object=${status.object_key ?? "-"}`,
  );
  recordEvent("s3_egress_status", `${status.status} · object=${status.object_key ?? "-"}`);
}

/**
 * Rebuilds the public URL the sender called.
 *
 * Webhook signatures cover the request host and path, so behind a tunnel or
 * reverse proxy the URL must reflect the forwarded scheme and host instead of
 * the internal `localhost` address.
 */
function publicRequestUrl(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost === null) {
    return request.url;
  }

  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto !== null) {
    url.protocol = `${forwardedProto}:`;
  }
  url.host = forwardedHost;
  return url.toString();
}

let handler: WebhookHandler | undefined;

function webhookHandler(): WebhookHandler {
  if (handler === undefined) {
    const secret = import.meta.env.MXRAVEN_WEBHOOK_SECRET;
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
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    return await webhookHandler().handle({
      method: request.method,
      // The signature covers the host and path the sender called, so rebuild
      // the public URL when running behind a tunnel or reverse proxy.
      url: publicRequestUrl(request),
      headers: request.headers,
      body: new Uint8Array(await request.arrayBuffer()),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Webhook handling failed." },
      { status: 500 },
    );
  }
};
