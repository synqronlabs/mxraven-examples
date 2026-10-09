import { createServer, type IncomingMessage } from "node:http";
import { fetchAndParseRawEmail } from "@mxraven/mail/mime";
import {
  WebhookHandler,
  eventType,
  type DeliveryStatus,
  type InboundEmail,
  type StorageStatus,
} from "@mxraven/mail/webhook";

/**
 * A real HTTP listener for mxRaven webhook deliveries.
 *
 * Run it with `npm run webhook`, expose the port with a tunnel
 * (`ngrok http 3000`), and point an mxRaven webhook endpoint at
 * `https://<tunnel>/webhook`.
 */

const port = Number(process.env.WEBHOOK_PORT ?? 3000);
const secret = process.env.MXRAVEN_WEBHOOK_SECRET;

if (secret === undefined || secret === "") {
  console.error("MXRAVEN_WEBHOOK_SECRET is missing. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

/**
 * `inbound_email` fires for every message routed to a webhook endpoint. The
 * payload only references the raw message, so download and parse it when the
 * body or attachments are needed. Never log `raw_email.access_token`.
 */
async function onInboundEmail(email: InboundEmail): Promise<void> {
  console.log(
    `[inbound_email] task=${email.task_id} from=${email.message.from?.join(", ") ?? "(unknown)"} subject=${email.message.subject ?? "(none)"}`,
  );
  const parsed = await fetchAndParseRawEmail(email.raw_email);
  console.log(
    `[inbound_email] parsed subject="${parsed.subject ?? ""}" attachments=${parsed.attachments.length}`,
  );
}

/** `delivery_status` reports the outcome of every outbound delivery attempt. */
function onDeliveryStatus(status: DeliveryStatus): void {
  console.log(
    `[delivery_status] task=${status.task_id} status=${status.status} smtp=${status.smtp_code ?? "-"} ${status.enhanced_status_code ?? ""}`,
  );
}

/** `s3_egress_status` reports an object-storage write initiated by a routing rule. */
function onStorageStatus(status: StorageStatus): void {
  console.log(
    `[s3_egress_status] task=${status.task_id ?? "-"} status=${status.status} object=${status.object_key ?? "-"}`,
  );
}

const webhook = new WebhookHandler({ secret })
  .on(eventType.inboundEmail, onInboundEmail)
  .on(eventType.deliveryStatus, onDeliveryStatus)
  .on(eventType.storageStatus, onStorageStatus);

/**
 * The public URL the sender called. Signatures cover the request host and
 * path, so forwarded headers are used when a tunnel or proxy is in front.
 */
function publicUrl(request: IncomingMessage): string {
  const hostHeader =
    request.headers["x-forwarded-host"] ?? request.headers.host ?? `localhost:${port}`;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  const protoHeader = request.headers["x-forwarded-proto"];
  const proto = (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader) ?? "http";
  return `${proto}://${host}${request.url ?? "/"}`;
}

async function readBody(request: IncomingMessage): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }
  return new Uint8Array(Buffer.concat(chunks));
}

const server = createServer((request, response) => {
  void (async () => {
    try {
      if (request.method !== "POST" || request.url !== "/webhook") {
        response.writeHead(404).end();
        return;
      }

      const result = await webhook.handle({
        method: request.method,
        url: publicUrl(request),
        headers: request.headers,
        body: await readBody(request),
      });

      console.log(`[delivery] responded ${result.status}`);
      response.writeHead(result.status).end();
    } catch (error) {
      console.error(error);
      response.writeHead(500).end();
    }
  })();
});

server.listen(port, () => {
  console.log(`mxRaven webhook listener on http://localhost:${port}/webhook`);
});
