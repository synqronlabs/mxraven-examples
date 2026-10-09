import type { APIRoute } from "astro";
import { Client, Message, SMTPError } from "@mxraven/mail";
import { createOtp, normalizeEmail, otpTtlMs } from "../../../lib/otp";

interface RequestOtpBody {
  email?: string;
  name?: string;
}

/**
 * POST /api/signup/request-otp
 *
 * Generates a 6-digit one-time code, stores only its hash, and emails the code
 * with `@mxraven/mail`. The code is never returned in the response.
 *
 * curl -s localhost:4321/api/signup/request-otp -H 'Content-Type: application/json' \
 *   -d '{"email":"you@example.com","name":"Ada"}'
 */
export const POST: APIRoute = async ({ request }) => {
  let body: RequestOtpBody;
  try {
    body = (await request.json()) as RequestOtpBody;
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (email === "" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json(
      { error: "`email` is required and must be a valid address." },
      { status: 400 },
    );
  }
  const name = typeof body.name === "string" && body.name.trim() !== "" ? body.name.trim() : "there";

  const host = import.meta.env.MXRAVEN_HOST;
  const username = import.meta.env.MXRAVEN_USERNAME;
  const secret = import.meta.env.MXRAVEN_SECRET;
  if (host === undefined || username === undefined || secret === undefined) {
    return Response.json(
      { error: "Set MXRAVEN_HOST, MXRAVEN_USERNAME, and MXRAVEN_SECRET in .env." },
      { status: 500 },
    );
  }

  const otp = createOtp(email);
  // Local development convenience only; never log codes in production.
  console.log(`[signup] OTP for ${email}: ${otp}`);

  const client = new Client({
    host,
    port: Number(import.meta.env.MXRAVEN_PORT ?? 587),
    username,
    secret,
  });

  const from = import.meta.env.MXRAVEN_MAIL_FROM ?? "noreply@your-domain.example";
  const message = new Message()
    .from(`Acme <${from}>`)
    .to(email)
    .subject("Your verification code")
    .text(`Hi ${name},\n\nYour verification code is ${otp}. It expires in 10 minutes.`)
    .html(
      `<p>Hi ${name},</p><p>Your verification code is <strong style="font-size: 20px; letter-spacing: 2px;">${otp}</strong>.</p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p>`,
    );

  try {
    const result = await client.send(message);
    return Response.json({ ok: true, messageRef: result.messageRef, expiresInSeconds: otpTtlMs / 1000 });
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
};
