import type { Metadata } from "next";
import { ExamplePage } from "@/components/example-page";
import { SendAttachmentsForm } from "./send-attachments-form";

export const metadata: Metadata = {
  title: "Attachments | mxRaven examples",
};

const code = `import { Client, Message } from "@mxraven/mail";

const client = new Client({
  host: process.env.MXRAVEN_HOST!,
  username: process.env.MXRAVEN_USERNAME!,
  secret: process.env.MXRAVEN_SECRET!,
});

const report = new TextEncoder().encode("id,name\\n1,Ada\\n2,Alan\\n");

const message = new Message()
  .from(process.env.MXRAVEN_MAIL_FROM!)
  .to(to)
  .subject("Your report")
  .html('<p><img src="cid:logo" alt="Acme logo" /></p>')
  .attach({ filename: "report.csv", contentType: "text/csv", data: report })
  .attachInline("logo.png", "logo", logoPng);

try {
  await client.send(message);
} finally {
  await client.close();
}`;

export default function SendAttachmentsPage() {
  return (
    <ExamplePage
      title="Attachments"
      description="Attach files as Uint8Array bytes, or inline an image the HTML body references with cid:. The SDK wraps bodies and attachments in multipart/mixed automatically."
      snippets={[{ label: "app/api/send-attachments/route.ts", code }]}
    >
      <SendAttachmentsForm />
    </ExamplePage>
  );
}
