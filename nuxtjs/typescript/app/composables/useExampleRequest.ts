import { ref } from "vue";

export interface RunState {
  status: "idle" | "running" | "done" | "error";
  message?: string;
  payload?: unknown;
}

export const inputClass =
  "rounded-md border border-black/10 bg-transparent px-3 py-2 text-base outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

export const buttonClass =
  "self-start rounded-md bg-foreground px-4 py-2 font-medium text-background transition-opacity outline-none hover:opacity-85 focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-50 dark:focus-visible:ring-white/30";

/**
 * Runs a request for a demo form and keeps the outcome for the result panel.
 * A non-2xx response is shown as a failure with the server's error message.
 */
export function useExampleRequest() {
  const state = ref<RunState>({ status: "idle" });

  async function run(request: () => Promise<Response>): Promise<void> {
    state.value = { status: "running" };
    try {
      const response = await request();
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload !== null && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : `Request failed with status ${response.status}.`;
        state.value = { status: "error", message, payload };
        return;
      }

      state.value = { status: "done", payload };
    } catch (error) {
      state.value = {
        status: "error",
        message: error instanceof Error ? error.message : "Could not reach the server.",
      };
    }
  }

  return { state, run };
}
