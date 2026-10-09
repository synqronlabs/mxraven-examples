<script setup lang="ts">
import ExamplePage from "~/components/ExamplePage.vue";
import ResultPanel from "~/components/ResultPanel.vue";
import { buttonClass, inputClass, useExampleRequest } from "~/composables/useExampleRequest";
import Welcome from "#shared/emails/Welcome.vue";

const { state, run } = useExampleRequest();
const to = ref("");
const name = ref("Ada");

function onSubmit(): void {
  void run(() =>
    fetch("/api/send-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: to.value, name: name.value }),
    }),
  );
}

const template = `<script setup lang="ts">
defineProps<{ name: string }>();
<\/script>

<template>
  <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6">
    <h1 style="font-size: 24px">Welcome, {{ name }}!</h1>
    <p>This message was rendered from a Vue component and sent with <code>@mxraven/mail</code>.</p>
    <p style="color: #666666">The Acme team</p>
  </div>
</template>`;

const send = `import { h } from "vue";
import { Client, Message, SMTPError } from "@mxraven/mail";
import { vue } from "@mxraven/vue";
import Welcome from "#shared/emails/Welcome.vue";

export default defineEventHandler(async (event) => {
  const { to, name } = await readBody(event);

  const client = new Client({
    host: process.env.MXRAVEN_HOST!,
    username: process.env.MXRAVEN_USERNAME!,
    secret: process.env.MXRAVEN_SECRET!,
  });

  const message = new Message()
    .from(\`Acme <\${process.env.MXRAVEN_MAIL_FROM}>\`)
    .to(to)
    .subject("Welcome to Acme")
    // The renderer runs inside send(), so it may be asynchronous.
    .render(vue(), h(Welcome, { name: name ?? "there" }));

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
    title="Vue templates"
    description="Write the email as a Vue single-file component and let @mxraven/vue render it server-side. Nitro's Rollup build gets the Vue plugin in nuxt.config, so server routes can import the same SFC the page previews. The renderer derives the plain-text alternative from the HTML, so the message ships as multipart/alternative."
    :snippets="[
      { title: 'Template', label: 'shared/emails/Welcome.vue', code: template },
      { title: 'Send', label: 'server/api/send-template.post.ts', code: send },
    ]"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <label class="flex flex-col gap-1 text-sm font-medium">
        <span>To</span>
        <input v-model="to" type="email" required placeholder="you@example.com" :class="inputClass" />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium">
        <span>Name</span>
        <input v-model="name" :class="inputClass" />
      </label>
      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium">Preview</span>
        <div class="rounded-xl border border-black/10 p-5 dark:border-white/15">
          <Welcome :name="name === '' ? 'there' : name" />
        </div>
      </div>
      <button type="submit" :disabled="state.status === 'running'" :class="buttonClass">
        Send welcome email
      </button>
      <ResultPanel :state="state" />
    </form>
  </ExamplePage>
</template>
