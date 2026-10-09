import { ExamplePage } from "@/components/example-page";
import { SendDeliveryByForm } from "./send-delivery-by-form";

export const metadata = {
  title: "Delivery deadlines | mxRaven examples",
};

const code = `import { Client, Message } from "@mxraven/mail";

const client = new Client({
  host: process.env.MXRAVEN_HOST,
  username: process.env.MXRAVEN_USERNAME,
  secret: process.env.MXRAVEN_SECRET,
});

const message = new Message()
  .from(process.env.MXRAVEN_MAIL_FROM)
  .to(to)
  .subject("Delivery deadline example")
  .text("This message asks mxRaven to apply a delivery deadline.");

try {
  const result = await client.send(message, {
    // RFC 2852 DELIVERBY: N notifies, R returns the message at the deadline
    deliveryBy: { seconds, mode },
    // RFC 3461 DSN options
    dsnRet: "FULL",
    envid,
  });
  console.log(result.messageRef);
} finally {
  await client.close();
}`;

export default function SendDeliveryByPage() {
  return (
    <ExamplePage
      title="Delivery deadlines and DSNs"
      description="Ask mxRaven to apply a delivery deadline and to report back through DSNs. The server must advertise DELIVERBY and DSN, otherwise send fails before transfer."
      snippets={[{ label: "app/api/send-delivery-by/route.js", code }]}
    >
      <SendDeliveryByForm />
    </ExamplePage>
  );
}
