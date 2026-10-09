<script setup lang="ts">
import ExamplePage from "~/components/ExamplePage.vue";
import ResultPanel from "~/components/ResultPanel.vue";
import { buttonClass, inputClass, useExampleRequest } from "~/composables/useExampleRequest";

const { state, run } = useExampleRequest();
const to = ref("");
const file = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

async function fileToBase64(value: File): Promise<string> {
  const bytes = new Uint8Array(await value.arrayBuffer());
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  file.value = input.files?.[0] ?? null;
}

function clearFile(): void {
  file.value = null;
  if (fileInput.value !== null) {
    fileInput.value.value = "";
  }
}

async function onSubmit(): Promise<void> {
  const upload =
    file.value === null
      ? undefined
      : {
          filename: file.value.name,
          contentType: file.value.type === "" ? undefined : file.value.type,
          dataBase64: await fileToBase64(file.value),
        };

  void run(() =>
    fetch("/api/send-attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: to.value, file: upload }),
    }),
  );
}

const code = `import { Client, Message, SMTPError } from "@mxraven/mail";

const logoPng = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
  (character) => character.charCodeAt(0),
);

export default defineEventHandler(async (event) => {
  const { to, file } = await readBody(event);

  const client = new Client({
    host: process.env.MXRAVEN_HOST!,
    username: process.env.MXRAVEN_USERNAME!,
    secret: process.env.MXRAVEN_SECRET!,
  });

  const report = new TextEncoder().encode("id,name\\n1,Ada\\n2,Alan\\n");

  const message = new Message()
    .from(process.env.MXRAVEN_MAIL_FROM!)
    .to(to)
    .subject("Your report")
    .html('<p><img src="cid:logo" alt="Acme logo" /></p>')
    .attach({ filename: "report.csv", contentType: "text/csv", data: report })
    // Inline images are referenced as \`cid:logo\` from the HTML body.
    .attachInline("logo.png", "logo", logoPng);

  if (file !== undefined) {
    message.attach({
      filename: file.filename,
      contentType: file.contentType,
      data: Uint8Array.from(atob(file.dataBase64), (character) => character.charCodeAt(0)),
    });
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
    title="Attachments"
    description="Attach files as Uint8Array bytes, or inline an image the HTML body references with cid:. The SDK wraps bodies and attachments in multipart/mixed automatically."
    :snippets="[{ label: 'server/api/send-attachments.post.ts', code }]"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <label class="flex flex-col gap-1 text-sm font-medium">
        <span>To</span>
        <input v-model="to" type="email" required placeholder="you@example.com" :class="inputClass" />
      </label>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        Every message includes a generated <code>report.csv</code> and an inline
        <code>logo.png</code> reference.
      </p>
      <div class="flex flex-col gap-1 text-sm font-medium">
        <span>Your own file<span class="ml-2 font-normal text-zinc-500">optional</span></span>
        <div class="flex flex-wrap items-center gap-3">
          <input
            id="attachment-file"
            ref="fileInput"
            type="file"
            class="sr-only"
            @change="onFileChange"
          />
          <label
            for="attachment-file"
            class="cursor-pointer rounded-md border border-black/10 px-3 py-2 text-sm font-medium outline-none transition-colors hover:border-black/30 focus-within:border-black/30 dark:border-white/15 dark:hover:border-white/40 dark:focus-within:border-white/40"
          >
            Choose file
          </label>
          <span class="text-sm font-normal text-zinc-500">
            {{ file === null ? "No file chosen" : file.name }}
          </span>
          <button
            v-if="file !== null"
            type="button"
            class="text-sm font-normal text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
            @click="clearFile"
          >
            Remove
          </button>
        </div>
      </div>
      <button type="submit" :disabled="state.status === 'running'" :class="buttonClass">
        Send with attachments
      </button>
      <ResultPanel :state="state" />
    </form>
  </ExamplePage>
</template>
