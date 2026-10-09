import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { createElement } from "react";
import { Client, Message, SMTPError } from "@mxraven/mail";
import { react } from "@mxraven/react";
import { WelcomeEmail } from "../emails/welcome";

/**
 * Astro action that sends a React-rendered welcome email.
 *
 * Actions are public entry points, so every field is validated with a schema
 * before the handler runs.
 */
export const server = {
  sendWelcome: defineAction({
    accept: "form",
    input: z.object({
      to: z.string().email(),
      name: z.string().optional(),
    }),
    handler: async ({ to, name }) => {
      const host = import.meta.env.MXRAVEN_HOST;
      const username = import.meta.env.MXRAVEN_USERNAME;
      const secret = import.meta.env.MXRAVEN_SECRET;
      if (host === undefined || username === undefined || secret === undefined) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Set MXRAVEN_HOST, MXRAVEN_USERNAME, and MXRAVEN_SECRET in .env.",
        });
      }

      const client = new Client({
        host,
        port: Number(import.meta.env.MXRAVEN_PORT ?? 587),
        username,
        secret,
      });

      const mail = new Message()
        .from(`Acme <${import.meta.env.MXRAVEN_MAIL_FROM ?? "noreply@your-domain.example"}>`)
        .to(to)
        .subject("Welcome to Acme")
        .render(react(), createElement(WelcomeEmail, { name: name || "there" }));

      try {
        const result = await client.send(mail);
        return { messageRef: result.messageRef };
      } catch (error) {
        if (error instanceof SMTPError) {
          throw new ActionError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        }
        throw error;
      } finally {
        await client.close();
      }
    },
  }),
};
