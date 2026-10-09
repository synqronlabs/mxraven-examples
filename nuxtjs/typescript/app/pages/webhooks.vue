<script setup lang="ts">
import ExamplePage from "~/components/ExamplePage.vue";
import type { StoredEvent } from "#shared/events";

const events = ref<StoredEvent[]>([]);

async function fetchEvents(): Promise<StoredEvent[]> {
  const response = await fetch("/api/webhook/events", { cache: "no-store" });
  return response.ok ? ((await response.json()) as StoredEvent[]) : [];
}

let timer: ReturnType<typeof setInterval> | undefined;
let active = true;

onMounted(() => {
  const load = (): void => {
    void fetchEvents().then((payload) => {
      if (active) {
        events.value = payload;
      }
    });
  };

  load();
  timer = setInterval(load, 3000);
});

onUnmounted(() => {
  active = false;
  if (timer !== undefined) {
    clearInterval(timer);
  }
});

async function refresh(): Promise<void> {
  events.value = await fetchEvents();
}

const route = `import { fetchAndParseRawEmail } from "@mxraven/mail/mime";
import { WebhookHandler, eventType } from "@mxraven/mail/webhook";

const webhook = new WebhookHandler({ secret: process.env.MXRAVEN_WEBHOOK_SECRET! });

// inbound_email only references the raw message, so download and parse it.
webhook.on(eventType.inboundEmail, async (email) => {
  const parsed = await fetchAndParseRawEmail(email.raw_email);
  console.log(parsed.subject, parsed.attachments.length);
});

webhook.on(eventType.deliveryStatus, (status) => {
  console.log(status.task_id, status.status);
});

webhook.on(eventType.storageStatus, (status) => {
  console.log(status.task_id, status.status);
});

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event);
  const raw = await readRawBody(event, false);

  // Signatures cover the host and path the sender called, so behind a tunnel
  // or reverse proxy rebuild the URL from the forwarded headers.
  return webhook.handle({
    method: request.method,
    url: publicRequestUrl(request),
    headers: request.headers,
    body: raw === undefined ? new Uint8Array(0) : new Uint8Array(raw),
  });
});`;
</script>

<template>
  <ExamplePage
    title="Webhooks"
    description="mxRaven signs every delivery with an HMAC over the timestamp, webhook ID, method, host, path, and body. This app is the HTTP server: the route below verifies each POST, decodes the payload, and dispatches typed events. Expose it with a tunnel and point a real webhook endpoint at it; deliveries appear in the live feed."
    :snippets="[{ label: 'server/api/webhook.post.ts', code: route }]"
  >
    <div class="flex flex-col gap-6">
      <div class="rounded-xl border border-black/10 p-5 text-sm dark:border-white/15">
        <p class="font-medium">Point real traffic at this listener</p>
        <ol class="mt-3 flex list-decimal flex-col gap-1.5 pl-5 text-zinc-600 dark:text-zinc-400">
          <li>Run the app with <code>bun dev</code>.</li>
          <li>Expose it with a tunnel, for example <code>ngrok http 3000</code>.</li>
          <li>
            In mxRaven, create a webhook endpoint pointing at
            <code>https://&lt;tunnel&gt;/api/webhook</code>.
          </li>
          <li>
            Copy its signing secret into <code>MXRAVEN_WEBHOOK_SECRET</code> in <code>.env</code> and
            restart.
          </li>
        </ol>
        <p class="mt-3 text-zinc-600 dark:text-zinc-400">
          Deliveries appear below within a few seconds.
        </p>
      </div>

      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="inline-flex items-center gap-2 text-sm font-medium">
            Live events
            <span class="inline-flex items-center gap-1.5 text-xs font-normal text-zinc-500">
              <span class="size-1.5 animate-pulse rounded-full bg-emerald-500" />
              listening
            </span>
          </span>
          <button
            type="button"
            class="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
            @click="refresh"
          >
            Refresh
          </button>
        </div>

        <p v-if="events.length === 0" class="text-sm text-zinc-500">
          Waiting for deliveries. Events recorded by the listener show up here.
        </p>
        <ul
          v-else
          class="flex flex-col divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/15"
        >
          <li v-for="event in events" :key="event.id" class="flex flex-col gap-1 p-4">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                class="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-xs font-semibold dark:bg-white/[.08]"
              >
                {{ event.type }}
              </span>
              <span class="text-xs text-zinc-500">
                {{ new Date(event.receivedAt).toLocaleTimeString() }}
              </span>
            </div>
            <span class="text-sm text-zinc-700 dark:text-zinc-300">{{ event.summary }}</span>
          </li>
        </ul>
      </div>
    </div>
  </ExamplePage>
</template>
