import { Client, Message, SMTPError } from "@mxraven/mail";
import { issueOtp, normalizeEmail, otpTtlMs } from "../../lib/otp";

interface RequestOtpBody {
  email?: string;
  name?: string;
}

/**
 * POST /api/signup/request-otp
 *
 * Generates a 6-digit one-time code with a CSPRNG, stores only its hash, and
 * emails the code with `@mxraven/mail`. The code is never returned in the
 * response.
 *
 * curl -s localhost:3000/api/signup/request-otp -H 'Content-Type: application/json' \
 *   -d '{"email":"you@example.com","name":"Ada"}'
 */
export default defineEventHandler(async (event) => {
  let body: RequestOtpBody;
  try {
    body = ((await readBody(event)) ?? {}) as RequestOtpBody;
  } catch {
    setResponseStatus(event, 400);
    return { error: "Request body must be JSON." };
  }

  const email = normalizeEmail(body.email);
  if (email === "" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    setResponseStatus(event, 400);
    return { error: "`email` is required and must be a valid address." };
  }
  const name = typeof body.name === "string" && body.name.trim() !== "" ? body.name.trim() : "there";

  const otp = issueOtp(email);

  // Local development convenience only; never log codes in production.
  console.log(`[signup] OTP for ${email}: ${otp}`);

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
    .to(email)
    .subject("Your verification code")
    .text(`Hi ${name},\n\nYour verification code is ${otp}. It expires in 10 minutes.`)
    .html(
      `<p>Hi ${name},</p><p>Your verification code is <strong style="font-size: 20px; letter-spacing: 2px;">${otp}</strong>.</p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p>`,
    );

  try {
    const result = await client.send(message);
    return { ok: true, messageRef: result.messageRef, expiresInSeconds: otpTtlMs / 1000 };
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
