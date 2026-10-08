import { Client, Message, SMTPError } from "@mxraven/mail";
import { react } from "@mxraven/react";
import { WelcomeEmail } from "@/emails/welcome";

interface SendReactBody {
  to?: string;
  name?: string;
}

/**
 * POST /api/send-react
 *
 * Renders a React component with `@mxraven/react` and sends it. The renderer
 * derives the plain-text alternative from the HTML, so the message is sent as
 * `multipart/alternative`.
 *
 * curl -s localhost:3000/api/send-react -H 'Content-Type: application/json' \
 *   -d '{"to":"you@example.com","name":"Ada"}'
 */
export async function POST(request: Request): Promise<Response> {
  let body: SendReactBody;
  try {
    body = (await request.json()) as SendReactBody;
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const { to } = body;
  if (typeof to !== "string" || to.trim() === "") {
    return Response.json({ error: "`to` is required." }, { status: 400 });
  }
  const name = typeof body.name === "string" && body.name.trim() !== "" ? body.name : "there";

  const host = process.env.MXRAVEN_HOST;
  const username = process.env.MXRAVEN_USERNAME;
  const secret = process.env.MXRAVEN_SECRET;
  if (host === undefined || username === undefined || secret === undefined) {
    return Response.json(
      { error: "Set MXRAVEN_HOST, MXRAVEN_USERNAME, and MXRAVEN_SECRET in .env." },
      { status: 500 },
    );
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
    .render(react(), <WelcomeEmail name={name} />);

  try {
    const result = await client.send(message);

    return Response.json({ messageRef: result.messageRef, code: result.code });
  } catch (error) {
    if (error instanceof SMTPError) {
      return Response.json(
        { error: error.message, code: error.code, permanent: error.permanent },
        { status: error.permanent ? 502 : 503 },
      );
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Send failed." },
      { status: 500 },
    );
  } finally {
    await client.close();
  }
}
