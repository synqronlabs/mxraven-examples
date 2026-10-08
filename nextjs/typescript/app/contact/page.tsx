import type { Metadata } from "next";
import { ExamplePage } from "@/components/example-page";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact form | mxRaven examples",
};

const code = `import { Client, Message } from "@mxraven/mail";
import { react } from "@mxraven/react";
import { ContactEmail } from "@/emails/contact";

const client = new Client({
  host: process.env.MXRAVEN_HOST!,
  username: process.env.MXRAVEN_USERNAME!,
  secret: process.env.MXRAVEN_SECRET!,
});

const mail = new Message()
  .from(process.env.MXRAVEN_MAIL_FROM!)
  .to(process.env.MXRAVEN_CONTACT_TO!)
  .replyTo(\`\${name} <\${email}>\`)
  .subject(\`Contact form: \${name}\`)
  .render(react(), <ContactEmail name={name} email={email} message={message} />);

try {
  const result = await client.send(mail);
  console.log(result.messageRef);
} finally {
  await client.close();
}`;

export default function ContactPage() {
  return (
    <ExamplePage
      title="Contact form"
      description="A form that emails you. The notification is rendered from a React component, and the submitter's address is set as Reply-To so you can answer directly."
      snippets={[{ label: "app/api/contact/route.tsx", code }]}
    >
      <ContactForm />
    </ExamplePage>
  );
}
