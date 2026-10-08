"use client";

import { useState, type FormEvent } from "react";
import { Field, ResultPanel, buttonClass, inputClass, useExampleRequest } from "@/components/runner";
import { sampleEmailText } from "@/lib/sample-email";

export function ParseInboundForm() {
  const { state, run } = useExampleRequest();
  const [raw, setRaw] = useState(sampleEmailText);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(() =>
      fetch("/api/parse-inbound", {
        method: "POST",
        body: raw,
      }),
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Raw message" hint="RFC 5322 / MIME bytes">
        <textarea
          rows={12}
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          spellCheck={false}
          className={`${inputClass} font-mono text-xs leading-5`}
        />
      </Field>
      <button type="submit" disabled={state.status === "running"} className={buttonClass}>
        Parse message
      </button>
      <ResultPanel state={state} />
    </form>
  );
}
