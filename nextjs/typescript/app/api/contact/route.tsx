import { Client, Message, SMTPError } from "@mxraven/mail";
import { react } from "@mxraven/react";
import { ContactEmail } from "@/emails/contact";

interface ContactBody {
  name?: string;
  email?: string;
  message?: string;
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * POST /api/contact
 *
 * Backs the form at `/contact`. Sends a notification email to
 * `MXRAVEN_CONTACT_TO` with the submitter's address as `Reply-To`.
 */
export async function POST(request: Request): Promise<Response> {
  let body: ContactBody;
  try {
    body = (await request.json()) as ContactBody;
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const name = clean(body.name);
  const email = clean(body.email);
  const message = clean(body.message);

  if (name === "" || email === "" || message === "") {
    return Response.json(
      { error: "`name`, `email`, and `message` are required." },
      { status: 400 },
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ error: "`email` is not a valid address." }, { status: 400 });
  }

  const host = process.env.MXRAVEN_HOST;
  const username = process.env.MXRAVEN_USERNAME;
  const secret = process.env.MXRAVEN_SECRET;
  const contactTo = process.env.MXRAVEN_CONTACT_TO;
  if (
    host === undefined ||
    username === undefined ||
    secret === undefined ||
    contactTo === undefined
  ) {
    return Response.json(
      {
        error:
          "Set MXRAVEN_HOST, MXRAVEN_USERNAME, MXRAVEN_SECRET, and MXRAVEN_CONTACT_TO in .env.",
      },
      { status: 500 },
    );
  }

  const client = new Client({
    host,
    port: Number(process.env.MXRAVEN_PORT ?? 587),
    username,
    secret,
  });

  const mail = new Message()
    .from(process.env.MXRAVEN_MAIL_FROM ?? "noreply@your-domain.example")
    .to(contactTo)
    .replyTo(`${name} <${email}>`)
    .subject(`Contact form: ${name}`)
    .render(react(), <ContactEmail name={name} email={email} message={message} />);

  try {
    const result = await client.send(mail);

    return Response.json({ ok: true, messageRef: result.messageRef });
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
