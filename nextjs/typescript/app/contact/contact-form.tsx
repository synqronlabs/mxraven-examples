"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "sending" | "sent" | "error";

/** Client form that submits to `POST /api/contact`. */
export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("sending");
    setError(undefined);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });

      if (response.ok) {
        form.reset();
        setStatus("sent");
        return;
      }

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? `Request failed with status ${response.status}.`);
      setStatus("error");
    } catch {
      setError("Could not reach the server.");
      setStatus("error");
    }
  }

  const field =
    "rounded-md border border-black/10 bg-transparent px-3 py-2 text-base outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40";

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-lg flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Name
        <input name="name" required autoComplete="name" className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="email" className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Message
        <textarea name="message" required rows={5} className={field} />
      </label>
      <button
        type="submit"
        disabled={status === "sending"}
        className="self-start rounded-md bg-foreground px-4 py-2 font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
      {status === "sent" && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Message sent. The notification goes to MXRAVEN_CONTACT_TO.
        </p>
      )}
      {status === "error" && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
