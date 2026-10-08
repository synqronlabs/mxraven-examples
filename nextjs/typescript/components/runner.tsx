"use client";

import { useState, type ReactNode } from "react";

export interface RunState {
  status: "idle" | "running" | "done" | "error";
  message?: string;
  payload?: unknown;
}

/**
 * Runs a request for a demo form and keeps the outcome for the result panel.
 * A non-2xx response is shown as a failure with the server's error message.
 */
export function useExampleRequest() {
  const [state, setState] = useState<RunState>({ status: "idle" });

  async function run(request: () => Promise<Response>): Promise<void> {
    setState({ status: "running" });
    try {
      const response = await request();
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload !== null && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : `Request failed with status ${response.status}.`;
        setState({ status: "error", message, payload });
        return;
      }

      setState({ status: "done", payload });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not reach the server.",
      });
    }
  }

  return { state, run };
}

export const inputClass =
  "rounded-md border border-black/10 bg-transparent px-3 py-2 text-base outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

export const buttonClass =
  "self-start rounded-md bg-foreground px-4 py-2 font-medium text-background transition-opacity outline-none hover:opacity-85 focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-50 dark:focus-visible:ring-white/30";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      <span>
        {label}
        {hint !== undefined && <span className="ml-2 font-normal text-zinc-500">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/** Like {@link Field}, but for controls that must not live inside a label. */
export function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm font-medium">
      <span>
        {label}
        {hint !== undefined && <span className="ml-2 font-normal text-zinc-500">{hint}</span>}
      </span>
      {children}
    </div>
  );
}

/** A two-option pill switch. */
export function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex self-start rounded-lg border border-black/10 p-1 dark:border-white/15">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-black/25 dark:focus-visible:ring-white/30 ${
            value === option.value
              ? "bg-foreground text-background"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ResultPanel({ state }: { state: RunState }) {
  if (state.status === "idle") {
    return null;
  }

  const tone =
    state.status === "error"
      ? "border-red-500/30 bg-red-500/5"
      : state.status === "done"
        ? "border-emerald-500/30 bg-emerald-500/5"
        : "border-black/10 dark:border-white/15";

  return (
    <div className={`rounded-xl border p-4 text-sm ${tone}`}>
      <p className="font-medium">
        {state.status === "running" ? "Running…" : state.status === "done" ? "Done" : "Failed"}
      </p>
      {state.message !== undefined && (
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">{state.message}</p>
      )}
      {state.payload != null && (
        <pre className="mt-2 overflow-x-auto rounded-lg bg-black/[.04] p-3 font-mono text-xs leading-5 dark:bg-white/[.06]">
          {JSON.stringify(state.payload, null, 2)}
        </pre>
      )}
    </div>
  );
}
