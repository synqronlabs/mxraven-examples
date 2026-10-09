import { sendEmail } from "./src/examples/send-email";
import { sendTemplate } from "./src/examples/send-template";
import { sendAttachments } from "./src/examples/send-attachments";
import { sendDeliveryBy } from "./src/examples/send-delivery-by";
import { sendRaw } from "./src/examples/send-raw";

/**
 * Runs every send example in sequence against one recipient.
 *
 *   bun run all you@example.com
 */
const steps: { name: string; run: (to: string) => Promise<string> }[] = [
  { name: "send-email", run: (to) => sendEmail(to) },
  { name: "send-template", run: (to) => sendTemplate(to, "Ada") },
  { name: "send-attachments", run: (to) => sendAttachments(to) },
  { name: "send-delivery-by", run: (to) => sendDeliveryBy(to) },
  { name: "send-raw", run: (to) => sendRaw(to) },
];

const to = process.argv[2] ?? process.env.MXRAVEN_MAIL_FROM;
if (to === undefined || to === "") {
  console.error("Usage: bun run all <to>");
  process.exit(1);
}

let failed = 0;
for (const step of steps) {
  console.log(`\n== ${step.name} ==`);
  try {
    await step.run(to);
  } catch (error) {
    failed += 1;
    console.error(`${step.name} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(`\n${steps.length - failed}/${steps.length} examples sent.`);
console.log("More: bun run parse, bun run feedback, bun run webhook");
process.exit(failed === 0 ? 0 : 1);
