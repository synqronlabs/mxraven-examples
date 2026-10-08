import type { Metadata } from "next";
import { ExamplePage } from "@/components/example-page";
import { SendEmailForm } from "./send-email-form";

export const metadata: Metadata = {
  title: "Send an email | mxRaven examples",
};

const code = `import { Client, Message } from "@mxraven/mail";

// One client per request; close it in \`finally\` to release the pool.
const client = new Client({
  host: process.env.MXRAVEN_HOST!,
  port: Number(process.env.MXRAVEN_PORT ?? 587),
  username: process.env.MXRAVEN_USERNAME!,
  secret: process.env.MXRAVEN_SECRET!,
});

const message = new Message()
  .from(\`Acme <\${process.env.MXRAVEN_MAIL_FROM}>\`)
  .to(to)
  .subject(subject)
  .text(text);

if (html !== undefined) {
  // text + html => multipart/alternative
  message.html(html);
}

try {
  const result = await client.send(message);
  console.log(result.messageRef);
} finally {
  await client.close();
}`;

export default function SendEmailPage() {
  return (
    <ExamplePage
      title="Send an email"
      description="Submit a plain-text message through the SMTP submission client. Add an HTML body and the SDK sends it as multipart/alternative, which improves deliverability."
      snippets={[{ label: "app/api/send-email/route.ts", code }]}
    >
      <SendEmailForm />
    </ExamplePage>
  );
}
