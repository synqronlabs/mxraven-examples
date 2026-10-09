<script setup lang="ts">
import ExamplePage from "~/components/ExamplePage.vue";
import ResultPanel from "~/components/ResultPanel.vue";
import { buttonClass, inputClass, useExampleRequest } from "~/composables/useExampleRequest";

const { state, run } = useExampleRequest();
const to = ref("");
const subject = ref("Hello from mxRaven");
const text = ref("This message was sent from the mxRaven Nuxt examples.");
const html = ref("");

function onSubmit(): void {
  void run(() =>
    fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: to.value,
        subject: subject.value,
        text: text.value,
        html: html.value === "" ? undefined : html.value,
      }),
    }),
  );
}

const code = `import { Client, Message, SMTPError } from "@mxraven/mail";

export default defineEventHandler(async (event) => {
  const { to, subject, text, html } = await readBody(event);

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
    title="Send an email"
    description="Submit a plain-text message through the SMTP submission client. Add an HTML body and the SDK sends it as multipart/alternative, which improves deliverability."
    :snippets="[{ label: 'server/api/send-email.post.ts', code }]"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <label class="flex flex-col gap-1 text-sm font-medium">
        <span>To</span>
        <input
          v-model="to"
          type="email"
          required
          placeholder="you@example.com"
          :class="inputClass"
        />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium">
        <span>Subject</span>
        <input v-model="subject" :class="inputClass" />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium">
        <span>Plain text</span>
        <textarea v-model="text" :rows="4" :class="inputClass" />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium">
        <span>HTML body<span class="ml-2 font-normal text-zinc-500">optional</span></span>
        <textarea
          v-model="html"
          :rows="4"
          placeholder="<p>Optional HTML alternative</p>"
          :class="inputClass"
        />
      </label>
      <button type="submit" :disabled="state.status === 'running'" :class="buttonClass">
        Send email
      </button>
      <ResultPanel :state="state" />
    </form>
  </ExamplePage>
</template>
