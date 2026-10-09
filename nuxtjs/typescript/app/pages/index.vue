<script setup lang="ts">
interface ExampleLink {
  href: string;
  title: string;
  description: string;
}

const groups: { heading: string; items: ExampleLink[] }[] = [
  {
    heading: "Sending",
    items: [
      {
        href: "/send-email",
        title: "Send an email",
        description: "Plain text, or multipart/alternative with an HTML body.",
      },
      {
        href: "/send-template",
        title: "Vue templates",
        description: "Render a VNode with @mxraven/vue.",
      },
      {
        href: "/send-attachments",
        title: "Attachments",
        description: "Files and inline images referenced with cid:.",
      },
      {
        href: "/send-delivery-by",
        title: "Delivery deadlines",
        description: "DELIVERBY, RET, and ENVID envelope parameters.",
      },
      {
        href: "/send-raw",
        title: "Raw messages",
        description: "Stream pre-serialized RFC 5322 bytes.",
      },
      {
        href: "/signup",
        title: "Signup verification",
        description: "Email a one-time code and verify it in two steps.",
      },
    ],
  },
  {
    heading: "Receiving",
    items: [
      {
        href: "/webhooks",
        title: "Webhooks",
        description: "Verify signatures and handle inbound and delivery events.",
      },
      {
        href: "/parse-inbound",
        title: "Parse inbound mail",
        description: "Decode MIME into headers, bodies, and attachments.",
      },
    ],
  },
];
</script>

<template>
  <main class="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-6 py-16">
    <header class="flex flex-col gap-3">
      <p class="text-sm font-medium uppercase tracking-widest text-zinc-500">
        @mxraven/mail · @mxraven/vue
      </p>
      <h1 class="text-4xl font-semibold tracking-tight">mxRaven Nuxt examples</h1>
      <p class="max-w-2xl text-zinc-600 dark:text-zinc-400">
        Every example has its own page with the code and a working demo. Copy
        <code class="rounded bg-black/[.06] px-1.5 py-0.5 dark:bg-white/[.08]">.env.example</code> to
        <code class="rounded bg-black/[.06] px-1.5 py-0.5 dark:bg-white/[.08]">.env</code>, fill in your
        credentials, then open an example below.
      </p>
    </header>

    <section v-for="group in groups" :key="group.heading" class="flex flex-col gap-4">
      <h2 class="text-xs font-semibold uppercase tracking-widest text-zinc-500">{{ group.heading }}</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <NuxtLink
          v-for="example in group.items"
          :key="example.href"
          :to="example.href"
          class="group flex flex-col gap-2 rounded-xl border border-black/10 p-5 transition-colors hover:border-black/30 dark:border-white/15 dark:hover:border-white/40"
        >
          <span class="text-lg font-medium">{{ example.title }}</span>
          <span class="text-sm text-zinc-600 dark:text-zinc-400">{{ example.description }}</span>
          <span
            class="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition-colors group-hover:text-zinc-900 dark:group-hover:text-zinc-100"
          >
            Open example
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              class="size-4 shrink-0"
              fill="none"
              stroke="currentColor"
              :stroke-width="1.5"
            >
              <path d="M6 3.5 10.5 8 6 12.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
