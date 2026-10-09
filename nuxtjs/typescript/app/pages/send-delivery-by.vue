<script setup lang="ts">
import ExamplePage from "~/components/ExamplePage.vue";
import ResultPanel from "~/components/ResultPanel.vue";
import { buttonClass, inputClass, useExampleRequest } from "~/composables/useExampleRequest";

const { state, run } = useExampleRequest();
const to = ref("");
const seconds = ref("3600");
const mode = ref<"N" | "R">("R");
const envid = ref("order-42");

const modeOptions = [
  { value: "R" as const, label: "R: return" },
  { value: "N" as const, label: "N: notify" },
];

function onSecondsInput(event: Event): void {
  seconds.value = (event.target as HTMLInputElement).value.replace(/[^0-9]/g, "");
}

function onSubmit(): void {
  void run(() =>
    fetch("/api/send-delivery-by", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: to.value,
        seconds: Number(seconds.value),
        mode: mode.value,
        envid: envid.value,
      }),
    }),
  );
}

const code = `import { Client, Message, SMTPError } from "@mxraven/mail";

export default defineEventHandler(async (event) => {
  const { to, seconds = 3600, mode = "R", envid } = await readBody(event);

  const client = new Client({
    host: process.env.MXRAVEN_HOST!,
    username: process.env.MXRAVEN_USERNAME!,
    secret: process.env.MXRAVEN_SECRET!,
  });

  const message = new Message()
    .from(process.env.MXRAVEN_MAIL_FROM!)
    .to(to)
    .subject("Delivery deadline example")
    .text(\`This message asks mxRaven to apply a \${seconds}s DELIVERBY deadline.\`);

  try {
    const result = await client.send(message, {
      // RFC 2852 DELIVERBY: N notifies, R returns the message at the deadline
      deliveryBy: { seconds, mode },
      // RFC 3461 DSN options
      dsnRet: "FULL",
      envid,
      // Servers reject MAIL FROM parameters they do not advertise, so do not
      // add custom X- parameters through \`extensionParams\` here.
    });
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
    title="Delivery deadlines and DSNs"
    description="Ask mxRaven to apply a delivery deadline and to report back through DSNs. The server must advertise DELIVERBY and DSN, otherwise send fails before transfer."
    :snippets="[{ label: 'server/api/send-delivery-by.post.ts', code }]"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <label class="flex flex-col gap-1 text-sm font-medium">
        <span>To</span>
        <input v-model="to" type="email" required placeholder="you@example.com" :class="inputClass" />
      </label>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="flex flex-col gap-1 text-sm font-medium">
          <span>Deadline<span class="ml-2 font-normal text-zinc-500">seconds</span></span>
          <input
            :value="seconds"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            :class="inputClass"
            @input="onSecondsInput"
          />
        </label>
        <div class="flex flex-col gap-1 text-sm font-medium">
          <span>Mode<span class="ml-2 font-normal text-zinc-500">N notifies, R returns</span></span>
          <div class="inline-flex self-start rounded-lg border border-black/10 p-1 dark:border-white/15">
            <button
              v-for="option in modeOptions"
              :key="option.value"
              type="button"
              :aria-pressed="mode === option.value"
              class="rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-black/25 dark:focus-visible:ring-white/30"
              :class="
                mode === option.value
                  ? 'bg-foreground text-background'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              "
              @click="mode = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
      <label class="flex flex-col gap-1 text-sm font-medium">
        <span>ENVID<span class="ml-2 font-normal text-zinc-500">tracking tag for DSNs</span></span>
        <input v-model="envid" :class="inputClass" />
      </label>
      <button type="submit" :disabled="state.status === 'running'" :class="buttonClass">
        Send with deadline
      </button>
      <ResultPanel :state="state" />
    </form>
  </ExamplePage>
</template>
