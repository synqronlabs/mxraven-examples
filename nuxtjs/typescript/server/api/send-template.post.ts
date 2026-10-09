import { h } from "vue";
import { Client, Message, SMTPError } from "@mxraven/mail";
import { vue } from "@mxraven/vue";
import Welcome from "#shared/emails/Welcome.vue";

interface SendTemplateBody {
  to?: string;
  name?: string;
}

/**
 * POST /api/send-template
 *
 * Renders a Vue template with `@mxraven/vue` and sends it. The renderer
 * derives the plain-text alternative from the HTML, so the message is sent as
 * `multipart/alternative`.
 *
 * curl -s localhost:3000/api/send-template -H 'Content-Type: application/json' \
 *   -d '{"to":"you@example.com","name":"Ada"}'
 */
export default defineEventHandler(async (event) => {
  let body: SendTemplateBody;
  try {
    body = ((await readBody(event)) ?? {}) as SendTemplateBody;
  } catch {
    setResponseStatus(event, 400);
    return { error: "Request body must be JSON." };
  }

  const { to } = body;
  if (typeof to !== "string" || to.trim() === "") {
    setResponseStatus(event, 400);
    return { error: "`to` is required." };
  }
  const name = typeof body.name === "string" && body.name.trim() !== "" ? body.name : "there";

  const host = process.env.MXRAVEN_HOST;
  const username = process.env.MXRAVEN_USERNAME;
  const secret = process.env.MXRAVEN_SECRET;
  if (host === undefined || username === undefined || secret === undefined) {
    setResponseStatus(event, 500);
    return { error: "Set MXRAVEN_HOST, MXRAVEN_USERNAME, and MXRAVEN_SECRET in .env." };
  }

  const client = new Client({
    host,
    port: Number(process.env.MXRAVEN_PORT ?? 587),
    username,
    secret,
  });

  const from = process.env.MXRAVEN_MAIL_FROM ?? "noreply@your-domain.example";
  const message = new Message()
    .from(`Acme <${from}>`)
    .to(to)
    .subject("Welcome to Acme")
    // The renderer runs inside send(), so it may be asynchronous.
    .render(vue(), h(Welcome, { name }));

  try {
    const result = await client.send(message);
    return { messageRef: result.messageRef, code: result.code };
  } catch (error) {
    if (error instanceof SMTPError) {
      setResponseStatus(event, error.permanent ? 502 : 503);
      return { error: error.message, code: error.code, permanent: error.permanent };
    }
    setResponseStatus(event, 500);
    return { error: error instanceof Error ? error.message : "Send failed." };
  } finally {
    await client.close();
  }
});
