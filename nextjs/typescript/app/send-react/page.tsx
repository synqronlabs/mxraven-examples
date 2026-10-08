import type { Metadata } from "next";
import { ExamplePage } from "@/components/example-page";
import { SendReactForm } from "./send-react-form";

export const metadata: Metadata = {
  title: "React templates | mxRaven examples",
};

const template = `import type { ReactElement } from "react";

export function WelcomeEmail({ name }: { name: string }): ReactElement {
  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: "24px" }}>Welcome, {name}!</h1>
      <p>
        This message was rendered from React and sent with <code>@mxraven/mail</code>.
      </p>
      <p style={{ color: "#666666" }}>The Acme team</p>
    </div>
  );
}`;

const send = `import { Client, Message } from "@mxraven/mail";
import { react } from "@mxraven/react";
import { WelcomeEmail } from "@/emails/welcome";

const client = new Client({
  host: process.env.MXRAVEN_HOST!,
  username: process.env.MXRAVEN_USERNAME!,
  secret: process.env.MXRAVEN_SECRET!,
});

const mail = new Message()
  .from(\`Acme <\${process.env.MXRAVEN_MAIL_FROM}>\`)
  .to(to)
  .subject("Welcome to Acme")
  .render(react(), <WelcomeEmail name={name} />);

try {
  const result = await client.send(mail);
  console.log(result.messageRef);
} finally {
  await client.close();
}`;

export default function SendReactPage() {
  return (
    <ExamplePage
      title="React templates"
      description="Write the email as a React component and let @mxraven/react render it server-side. The renderer derives the plain-text alternative from the HTML, so the message ships as multipart/alternative."
      snippets={[
        { title: "Template", label: "emails/welcome.tsx", code: template },
        { title: "Send", label: "app/api/send-react/route.tsx", code: send },
      ]}
    >
      <SendReactForm />
    </ExamplePage>
  );
}
