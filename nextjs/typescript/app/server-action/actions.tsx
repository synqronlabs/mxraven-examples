"use server";

import { Client, Message, SMTPError } from "@mxraven/mail";
import { react } from "@mxraven/react";
import { WelcomeEmail } from "@/emails/welcome";

export interface WelcomeState {
  status: "idle" | "sent" | "error";
  message: string;
}

/**
 * Server action that sends a React-rendered welcome email.
 *
 * The first parameter is the previous state, as required by `useActionState`.
 * Actions are public entry points, so validate every field like any API input.
 */
export async function sendWelcomeAction(
  _prevState: WelcomeState,
  formData: FormData,
): Promise<WelcomeState> {
  const to = String(formData.get("to") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || "there";

  if (to === "") {
    return { status: "error", message: "`to` is required." };
  }

  const host = process.env.MXRAVEN_HOST;
  const username = process.env.MXRAVEN_USERNAME;
  const secret = process.env.MXRAVEN_SECRET;
  if (host === undefined || username === undefined || secret === undefined) {
    return {
      status: "error",
      message: "Set MXRAVEN_HOST, MXRAVEN_USERNAME, and MXRAVEN_SECRET in .env.",
    };
  }

  const client = new Client({
    host,
    port: Number(process.env.MXRAVEN_PORT ?? 587),
    username,
    secret,
  });

  const mail = new Message()
    .from(`Acme <${process.env.MXRAVEN_MAIL_FROM ?? "noreply@your-domain.example"}>`)
    .to(to)
    .subject("Welcome to Acme")
    .render(react(), <WelcomeEmail name={name} />);

  try {
    const result = await client.send(mail);
    return { status: "sent", message: `Accepted as ${result.messageRef}.` };
  } catch (error) {
    if (error instanceof SMTPError) {
      return { status: "error", message: `${error.code} ${error.message}` };
    }
    return { status: "error", message: error instanceof Error ? error.message : "Send failed." };
  } finally {
    await client.close();
  }
}
