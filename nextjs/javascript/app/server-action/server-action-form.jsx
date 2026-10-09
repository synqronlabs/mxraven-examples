"use client";

import { useActionState } from "react";
import { Field, ResultPanel, buttonClass, inputClass } from "@/components/runner";
import { sendWelcomeAction } from "./actions";

const initialState = { status: "idle", message: "" };

export function ServerActionForm() {
  const [state, formAction, pending] = useActionState(sendWelcomeAction, initialState);

  const result = pending
    ? { status: "running" }
    : state.status === "idle"
      ? { status: "idle" }
      : state.status === "sent"
        ? { status: "done", message: state.message }
        : { status: "error", message: state.message };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="To">
        <input type="email" name="to" required placeholder="you@example.com" className={inputClass} />
      </Field>
      <Field label="Name">
        <input name="name" defaultValue="Ada" className={inputClass} />
      </Field>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Sending…" : "Send welcome email"}
      </button>
      <ResultPanel state={result} />
    </form>
  );
}
