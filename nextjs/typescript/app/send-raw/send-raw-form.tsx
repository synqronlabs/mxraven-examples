"use client";

import { useState, type FormEvent } from "react";
import { Field, ResultPanel, buttonClass, inputClass, useExampleRequest } from "@/components/runner";

export function SendRawForm() {
  const { state, run } = useExampleRequest();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("Raw message example");
  const [text, setText] = useState("These are pre-serialized RFC 5322 bytes.");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(() =>
      fetch("/api/send-raw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, text }),
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
      <Field label="Subject">
        <input value={subject} onChange={(event) => setSubject(event.target.value)} className={inputClass} />
      </Field>
      <Field label="Plain text">
        <textarea rows={4} value={text} onChange={(event) => setText(event.target.value)} className={inputClass} />
      </Field>
      <button type="submit" disabled={state.status === "running"} className={buttonClass}>
        Send raw message
      </button>
      <ResultPanel state={state} />
    </form>
  );
}
