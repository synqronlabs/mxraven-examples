import type { Metadata } from "next";
import { ExamplePage } from "@/components/example-page";
import { ParseInboundForm } from "./parse-inbound-form";

export const metadata: Metadata = {
  title: "Parse inbound mail | mxRaven examples",
};

const code = `import { parseEmail } from "@mxraven/mail/mime";

const email = parseEmail(rawBytes);

console.log(email.subject);
console.log(email.from, email.to);
console.log(email.attachments.map((a) => a.filename));`;

export default function ParseInboundPage() {
  return (
    <ExamplePage
      title="Parse inbound mail"
      description="Decode raw RFC 5322 / MIME bytes into headers, addresses, text and HTML bodies, and attachments. The parser is lenient with malformed mail and decodes base64, quoted-printable, encoded words, and RFC 2231 parameters."
      snippets={[{ label: "app/api/parse-inbound/route.ts", code }]}
    >
      <ParseInboundForm />
    </ExamplePage>
  );
}
