import type { Metadata } from "next";
import { ExamplePage } from "@/components/example-page";
import { ServerActionForm } from "./server-action-form";

export const metadata: Metadata = {
  title: "Server action | mxRaven examples",
};

const action = `"use server";

import { Client, Message, SMTPError } from "@mxraven/mail";
import { react } from "@mxraven/react";
import { WelcomeEmail } from "@/emails/welcome";

export async function sendWelcomeAction(
  _prevState: WelcomeState,
  formData: FormData,
): Promise<WelcomeState> {
  const to = String(formData.get("to") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || "there";

  const client = new Client({
    host: process.env.MXRAVEN_HOST!,
    username: process.env.MXRAVEN_USERNAME!,
    secret: process.env.MXRAVEN_SECRET!,
  });

  const mail = new Message()
    .from(\`Acme <\${process.env.MXRAVEN_MAIL_FROM}>\`)
    .to(to)
    .subject("Welcome to Acme")
    .render(react(), <WelcomeEmail name={name} />);

  try {
    const result = await client.send(mail);
    return { status: "sent", message: \`Accepted as \${result.messageRef}.\` };
  } catch (error) {
    if (error instanceof SMTPError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Send failed." };
  } finally {
    await client.close();
  }
}`;

const form = `"use client";

import { useActionState } from "react";
import { sendWelcomeAction, type WelcomeState } from "./actions";

const initialState: WelcomeState = { status: "idle", message: "" };

export function ServerActionForm() {
  const [state, formAction, pending] = useActionState(sendWelcomeAction, initialState);

  return (
    <form action={formAction}>
      <input name="to" type="email" required />
      <input name="name" defaultValue="Ada" />
      <button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send welcome email"}
      </button>
      {state.status !== "idle" && <p>{state.message}</p>}
    </form>
  );
}`;

export default function ServerActionPage() {
  return (
    <ExamplePage
      title="Server action"
      description="Send mail straight from a form with a server action instead of an API route. The action runs on the server, validates the fields, sends the React template, and returns a result for useActionState."
      snippets={[
        { title: "Action", label: "app/server-action/actions.tsx", code: action },
        { title: "Form", label: "app/server-action/server-action-form.tsx", code: form },
      ]}
    >
      <ServerActionForm />
    </ExamplePage>
  );
}
