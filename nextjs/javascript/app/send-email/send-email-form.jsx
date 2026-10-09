"use client";

import { useState } from "react";
import { Field, ResultPanel, buttonClass, inputClass, useExampleRequest } from "@/components/runner";

export function SendEmailForm() {
  const { state, run } = useExampleRequest();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("Hello from mxRaven");
  const [text, setText] = useState("This message was sent from the mxRaven Next.js examples.");
  const [html, setHtml] = useState("");

  function onSubmit(event) {
    event.preventDefault();
    void run(() =>
      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, text, html: html === "" ? undefined : html }),
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
        <textarea
          rows={4}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="HTML body" hint="optional">
        <textarea
          rows={4}
          value={html}
          onChange={(event) => setHtml(event.target.value)}
          placeholder="<p>Optional HTML alternative</p>"
          className={inputClass}
        />
      </Field>
      <button type="submit" disabled={state.status === "running"} className={buttonClass}>
        Send email
      </button>
      <ResultPanel state={state} />
    </form>
  );
}
