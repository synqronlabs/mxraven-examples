import type { Metadata } from "next";
import { ExamplePage } from "@/components/example-page";
import { WebhookFeed } from "./webhook-feed";

export const metadata: Metadata = {
  title: "Webhooks | mxRaven examples",
};

const route = `import { fetchAndParseRawEmail } from "@mxraven/mail/mime";
import { WebhookHandler, eventType } from "@mxraven/mail/webhook";

const webhook = new WebhookHandler({ secret: process.env.MXRAVEN_WEBHOOK_SECRET! });

webhook.on(eventType.inboundEmail, async (email) => {
  const parsed = await fetchAndParseRawEmail(email.raw_email);
  console.log(parsed.subject, parsed.attachments.length);
});

webhook.on(eventType.deliveryStatus, (status) => {
  console.log(status.task_id, status.status);
});

// A Fetch-native runtime passes the Request straight through.
export const POST = (request: Request) => webhook.handle(request);`;

export default function WebhooksPage() {
  return (
    <ExamplePage
      title="Webhooks"
      description="mxRaven signs every delivery with an HMAC over the timestamp, webhook ID, method, host, path, and body. This app is the HTTP server: the route below verifies each POST, decodes the payload, and dispatches typed events. Expose it with a tunnel and point a real webhook endpoint at it; deliveries appear in the live feed."
      snippets={[{ label: "app/api/webhook/route.ts", code: route }]}
    >
      <WebhookFeed />
    </ExamplePage>
  );
}
