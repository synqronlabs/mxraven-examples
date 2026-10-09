<script setup lang="ts">
import ExamplePage from "~/components/ExamplePage.vue";
import ResultPanel from "~/components/ResultPanel.vue";
import { buttonClass, inputClass, useExampleRequest } from "~/composables/useExampleRequest";
import { sampleEmailText } from "#shared/sample-email";

const { state, run } = useExampleRequest();
const raw = ref(sampleEmailText);

function onSubmit(): void {
  void run(() =>
    fetch("/api/parse-inbound", {
      method: "POST",
      body: raw.value,
    }),
  );
}

const code = `import { parseEmail } from "@mxraven/mail/mime";

export default defineEventHandler(async (event) => {
  const raw = await readRawBody(event, false);
  if (raw === undefined || raw.byteLength === 0) {
    setResponseStatus(event, 400);
    return { error: "POST the raw RFC 5322 message as the request body." };
  }

  try {
    const email = parseEmail(new Uint8Array(raw));
    return {
      subject: email.subject,
      from: email.from,
      to: email.to,
      cc: email.cc,
      text: email.text,
      html: email.html,
      attachments: email.attachments.map((attachment) => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.content.byteLength,
      })),
    };
  } catch (error) {
    setResponseStatus(event, 422);
    return { error: error instanceof Error ? error.message : "Could not parse the message." };
  }
});`;
</script>

<template>
  <ExamplePage
    title="Parse inbound mail"
    description="Decode raw RFC 5322 / MIME bytes into headers, addresses, text and HTML bodies, and attachments. The parser is lenient with malformed mail and decodes base64, quoted-printable, encoded words, and RFC 2231 parameters."
    :snippets="[{ label: 'server/api/parse-inbound.post.ts', code }]"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <label class="flex flex-col gap-1 text-sm font-medium">
        <span>Raw message<span class="ml-2 font-normal text-zinc-500">RFC 5322 / MIME bytes</span></span>
        <textarea
          v-model="raw"
          :rows="12"
          spellcheck="false"
          :class="`${inputClass} font-mono text-xs leading-5`"
        />
      </label>
      <button type="submit" :disabled="state.status === 'running'" :class="buttonClass">
        Parse message
      </button>
      <ResultPanel :state="state" />
    </form>
  </ExamplePage>
</template>
