export interface RunState {
  status: "idle" | "running" | "done" | "error";
  message?: string;
  payload?: unknown;
}

/** Renders the outcome of a demo request into a container. */
export function renderResult(container: HTMLElement, state: RunState): void {
  container.replaceChildren();
  if (state.status === "idle") return;

  const tone =
    state.status === "error"
      ? "border-red-500/30 bg-red-500/5"
      : state.status === "done"
        ? "border-emerald-500/30 bg-emerald-500/5"
        : "border-black/10 dark:border-white/15";

  const box = document.createElement("div");
  box.className = `rounded-xl border p-4 text-sm ${tone}`;

  const title = document.createElement("p");
  title.className = "font-medium";
  title.textContent =
    state.status === "running" ? "Running…" : state.status === "done" ? "Done" : "Failed";
  box.append(title);

  if (state.message !== undefined) {
    const message = document.createElement("p");
    message.className = "mt-1 text-zinc-600 dark:text-zinc-400";
    message.textContent = state.message;
    box.append(message);
  }

  if (state.payload != null) {
    const pre = document.createElement("pre");
    pre.className =
      "mt-2 overflow-x-auto rounded-lg bg-black/[.04] p-3 font-mono text-xs leading-5 dark:bg-white/[.06]";
    pre.textContent = JSON.stringify(state.payload, null, 2);
    box.append(pre);
  }

  container.append(box);
}

/** Posts JSON to an endpoint and renders the result. Returns true on success. */
export async function postJson(
  endpoint: string,
  body: unknown,
  container: HTMLElement,
  button?: HTMLButtonElement | null,
): Promise<boolean> {
  if (button) button.disabled = true;
  renderResult(container, { status: "running" });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        payload !== null && typeof payload === "object" && "error" in payload
          ? String((payload as { error: unknown }).error)
          : `Request failed with status ${response.status}.`;
      renderResult(container, { status: "error", message, payload });
      return false;
    }

    renderResult(container, { status: "done", payload });
    return true;
  } catch (error) {
    renderResult(container, {
      status: "error",
      message: error instanceof Error ? error.message : "Could not reach the server.",
    });
    return false;
  } finally {
    if (button) button.disabled = false;
  }
}
