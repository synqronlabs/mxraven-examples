import type { Metadata } from "next";
import { ExamplePage } from "@/components/example-page";
import { SendRawForm } from "./send-raw-form";

export const metadata: Metadata = {
  title: "Raw messages | mxRaven examples",
};

const code = `import { Client } from "@mxraven/mail";

const client = new Client({
  host: process.env.MXRAVEN_HOST!,
  username: process.env.MXRAVEN_USERNAME!,
  secret: process.env.MXRAVEN_SECRET!,
});

const raw = [
  \`From: \${from}\`,
  \`To: \${to}\`,
  \`Subject: \${subject}\`,
  "MIME-Version: 1.0",
  'Content-Type: text/plain; charset="utf-8"',
  "",
  text,
].join("\\r\\n");

try {
  const result = await client.sendRaw(
    { from, to: [{ address: to, notify: ["FAILURE", "DELAY"], orcpt: to }] },
    new TextEncoder().encode(raw),
  );
  console.log(result.messageRef);
} finally {
  await client.close();
}`;

export default function SendRawPage() {
  return (
    <ExamplePage
      title="Raw messages"
      description="Stream an already serialized RFC 5322 message with an explicit envelope. Use this for large or pre-rendered mail; the SDK does not parse the bytes. The envelope can carry per-recipient DSN options."
      snippets={[{ label: "app/api/send-raw/route.ts", code }]}
    >
      <SendRawForm />
    </ExamplePage>
  );
}
