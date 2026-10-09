<script setup lang="ts">
import ExamplePage from "~/components/ExamplePage.vue";
import ResultPanel from "~/components/ResultPanel.vue";
import { buttonClass, inputClass, useExampleRequest } from "~/composables/useExampleRequest";

const { state, run } = useExampleRequest();
const to = ref("");
const subject = ref("Raw message example");
const text = ref("These are pre-serialized RFC 5322 bytes.");

function onSubmit(): void {
  void run(() =>
    fetch("/api/send-raw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: to.value, subject: subject.value, text: text.value }),
    }),
  );
}

const code = `import { Client, SMTPError } from "@mxraven/mail";

export default defineEventHandler(async (event) => {
  const { to, subject, text } = await readBody(event);

  const client = new Client({
    host: process.env.MXRAVEN_HOST!,
    username: process.env.MXRAVEN_USERNAME!,
    secret: process.env.MXRAVEN_SECRET!,
  });

  const from = process.env.MXRAVEN_MAIL_FROM!;
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
    // The envelope is separate from the message and carries per-recipient DSN options.
    const result = await client.sendRaw(
      { from, to: [{ address: to, notify: ["FAILURE", "DELAY"], orcpt: to }] },
      new TextEncoder().encode(raw),
    );
    return { messageRef: result.messageRef, code: result.code };
  } catch (error) {
    if (error instanceof SMTPError) {
      setResponseStatus(event, error.permanent ? 502 : 503);
      return { error: error.message, code: error.code, permanent: error.permanent };
    }
    setResponseStatus(event, 500);
    return { error: error instanceof Error ? error.message : "Send failed." };
  } finally {
    await client.close();
  }
});`;
</script>

<template>
  <ExamplePage
    title="Raw messages"
    description="Stream an already serialized RFC 5322 message with an explicit envelope. Use this for large or pre-rendered mail; the SDK does not parse the bytes. The envelope can carry per-recipient DSN options."
    :snippets="[{ label: 'server/api/send-raw.post.ts', code }]"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <label class="flex flex-col gap-1 text-sm font-medium">
        <span>To</span>
        <input v-model="to" type="email" required placeholder="you@example.com" :class="inputClass" />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium">
        <span>Subject</span>
        <input v-model="subject" :class="inputClass" />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium">
        <span>Plain text</span>
        <textarea v-model="text" :rows="4" :class="inputClass" />
      </label>
      <button type="submit" :disabled="state.status === 'running'" :class="buttonClass">
        Send raw message
      </button>
      <ResultPanel :state="state" />
    </form>
  </ExamplePage>
</template>
