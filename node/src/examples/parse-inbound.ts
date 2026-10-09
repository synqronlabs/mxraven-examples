import { readFile } from "node:fs/promises";
import { parseEmail } from "@mxraven/mail/mime";
import { sampleEmailBytes, sampleEmailText } from "../lib/sample-email.ts";

/** Parses a raw RFC 5322 / MIME message into headers, bodies, and attachments. */
export function parseInbound(bytes: Uint8Array): void {
  const email = parseEmail(bytes);

  console.log(`Subject:   ${email.subject ?? "(none)"}`);
  console.log(`From:      ${email.from.map((address) => address.address).join(", ")}`);
  console.log(`To:        ${email.to.map((address) => address.address).join(", ")}`);
  console.log(`Message-ID: ${email.messageId ?? "(none)"}`);
  console.log(`Attachments: ${email.attachments.length}`);

  for (const attachment of email.attachments) {
    console.log(`  - ${attachment.filename ?? "(unnamed)"} ${attachment.contentType} (${attachment.content.byteLength} bytes)`);
  }

  if (email.text !== undefined) {
    console.log(`Text:      ${JSON.stringify(email.text.trim())}`);
  }
}

if (import.meta.main) {
  const path = process.argv[2];
  if (path === undefined || path === "") {
    console.log("No file given; parsing the built-in sample message.\n");
    console.log(sampleEmailText.split("\n").slice(0, 3).join("\n"), "\n...\n");
    parseInbound(sampleEmailBytes());
  } else {
    parseInbound(await readFile(path));
  }
}
