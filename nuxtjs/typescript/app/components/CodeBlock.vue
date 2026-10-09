<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps<{
  code: string;
  label?: string;
}>();

const copied = ref(false);

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.code);
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    copied.value = false;
  }
}
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-black/10 bg-zinc-950 dark:border-white/15">
    <div class="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2">
      <span class="truncate font-mono text-xs text-zinc-400">{{ label ?? "code" }}</span>
      <button
        type="button"
        class="rounded-md border border-white/10 px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-white/25 hover:text-zinc-100"
        @click="copy"
      >
        {{ copied ? "Copied" : "Copy" }}
      </button>
    </div>
    <pre class="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-zinc-100">{{ code }}</pre>
  </div>
</template>
