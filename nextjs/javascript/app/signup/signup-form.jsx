"use client";

import { useState } from "react";
import { Field, ResultPanel, buttonClass, inputClass, useExampleRequest } from "@/components/runner";

export function SignupForm() {
  const request = useExampleRequest();
  const verify = useExampleRequest();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("Ada");
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  function onRequest(event) {
    event.preventDefault();
    void request.run(async () => {
      const response = await fetch("/api/signup/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      if (response.ok) {
        setCodeSent(true);
      }
      return response;
    });
  }

  function onVerify(event) {
    event.preventDefault();
    void verify.run(() =>
      fetch("/api/signup/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      }),
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={onRequest} className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
          1. Request a code
        </h3>
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </Field>
        <Field label="Name">
          <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
        </Field>
        <button type="submit" disabled={request.state.status === "running"} className={buttonClass}>
          Send code
        </button>
        <ResultPanel state={request.state} />
      </form>

      <form onSubmit={onVerify} className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
          2. Verify the code
        </h3>
        <Field label="Code" hint="6 digits from the email">
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/[^0-9]/g, ""))}
            placeholder="123456"
            className={inputClass}
          />
        </Field>
        <button type="submit" disabled={verify.state.status === "running"} className={buttonClass}>
          Verify code
        </button>
        {!codeSent && (
          <p className="text-sm text-zinc-500">Request a code first; it is printed to the server console for local testing.</p>
        )}
        <ResultPanel state={verify.state} />
      </form>
    </div>
  );
}
