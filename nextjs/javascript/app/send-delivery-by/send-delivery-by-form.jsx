"use client";

import { useState } from "react";
import {
  Field,
  FieldGroup,
  ResultPanel,
  Segmented,
  buttonClass,
  inputClass,
  useExampleRequest,
} from "@/components/runner";

export function SendDeliveryByForm() {
  const { state, run } = useExampleRequest();
  const [to, setTo] = useState("");
  const [seconds, setSeconds] = useState("3600");
  const [mode, setMode] = useState("R");
  const [envid, setEnvid] = useState("order-42");

  function onSubmit(event) {
    event.preventDefault();
    void run(() =>
      fetch("/api/send-delivery-by", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, seconds: Number(seconds), mode, envid }),
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Deadline" hint="seconds">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={seconds}
            onChange={(event) => setSeconds(event.target.value.replace(/[^0-9]/g, ""))}
            className={inputClass}
          />
        </Field>
        <FieldGroup label="Mode" hint="N notifies, R returns">
          <Segmented
            options={[
              { value: "R", label: "R: return" },
              { value: "N", label: "N: notify" },
            ]}
            value={mode}
            onChange={(value) => setMode(value === "N" ? "N" : "R")}
          />
        </FieldGroup>
      </div>
      <Field label="ENVID" hint="tracking tag for DSNs">
        <input value={envid} onChange={(event) => setEnvid(event.target.value)} className={inputClass} />
      </Field>
      <button type="submit" disabled={state.status === "running"} className={buttonClass}>
        Send with deadline
      </button>
      <ResultPanel state={state} />
    </form>
  );
}
