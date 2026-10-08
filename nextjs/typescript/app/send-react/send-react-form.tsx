"use client";

import { useState, type FormEvent } from "react";
import { Field, ResultPanel, buttonClass, inputClass, useExampleRequest } from "@/components/runner";
import { WelcomeEmail } from "@/emails/welcome";

export function SendReactForm() {
  const { state, run } = useExampleRequest();
  const [to, setTo] = useState("");
  const [name, setName] = useState("Ada");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(() =>
      fetch("/api/send-react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, name }),
      }),
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="To">
        <input
          type="email"
          required
          value={to}
          onChange={(event) => setTo(event.target.value)}
          placeholder="you@example.com"
          className={inputClass}
        />
      </Field>
      <Field label="Name">
        <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
      </Field>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Preview</span>
        <div className="rounded-xl border border-black/10 p-5 dark:border-white/15">
          <WelcomeEmail name={name === "" ? "there" : name} />
        </div>
      </div>
      <button type="submit" disabled={state.status === "running"} className={buttonClass}>
        Send welcome email
      </button>
      <ResultPanel state={state} />
    </form>
  );
}
