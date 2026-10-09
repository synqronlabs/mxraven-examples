<script setup lang="ts">
import { computed } from "vue";
import type { RunState } from "~/composables/useExampleRequest";

const props = defineProps<{ state: RunState }>();

const tone = computed(() =>
  props.state.status === "error"
    ? "border-red-500/30 bg-red-500/5"
    : props.state.status === "done"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : "border-black/10 dark:border-white/15",
);

const label = computed(() =>
  props.state.status === "running" ? "Running…" : props.state.status === "done" ? "Done" : "Failed",
);
</script>

<template>
  <div v-if="state.status !== 'idle'" class="rounded-xl border p-4 text-sm" :class="tone">
    <p class="font-medium">{{ label }}</p>
    <p v-if="state.message !== undefined" class="mt-1 text-zinc-600 dark:text-zinc-400">
      {{ state.message }}
    </p>
    <pre
      v-if="state.payload != null"
      class="mt-2 overflow-x-auto rounded-lg bg-black/[.04] p-3 font-mono text-xs leading-5 dark:bg-white/[.06]"
    >{{ JSON.stringify(state.payload, null, 2) }}</pre>
  </div>
</template>
