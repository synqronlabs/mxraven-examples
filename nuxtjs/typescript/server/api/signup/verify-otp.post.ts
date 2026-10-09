import { codeMatches, maxAttempts, normalizeEmail, pendingOtps } from "../../lib/otp";

interface VerifyOtpBody {
  email?: string;
  otp?: string;
}

/**
 * POST /api/signup/verify-otp
 *
 * Verifies the code with a constant-time comparison, limits attempts, and
 * consumes the code on success.
 *
 * curl -s localhost:3000/api/signup/verify-otp -H 'Content-Type: application/json' \
 *   -d '{"email":"you@example.com","otp":"123456"}'
 */
export default defineEventHandler(async (event) => {
  let body: VerifyOtpBody;
  try {
    body = ((await readBody(event)) ?? {}) as VerifyOtpBody;
  } catch {
    setResponseStatus(event, 400);
    return { error: "Request body must be JSON." };
  }

  const email = normalizeEmail(body.email);
  const otp = typeof body.otp === "string" ? body.otp.trim() : "";

  if (email === "" || otp === "") {
    setResponseStatus(event, 400);
    return { error: "`email` and `otp` are required." };
  }

  const pending = pendingOtps.get(email);
  if (pending === undefined) {
    setResponseStatus(event, 400);
    return { error: "No pending code for this address. Request a new one." };
  }

  if (Date.now() > pending.expiresAt) {
    pendingOtps.delete(email);
    setResponseStatus(event, 400);
    return { error: "The code expired. Request a new one." };
  }

  if (pending.attempts >= maxAttempts) {
    pendingOtps.delete(email);
    setResponseStatus(event, 429);
    return { error: "Too many attempts. Request a new code." };
  }

  if (!codeMatches(email, otp, pending.hash)) {
    pending.attempts += 1;
    // A generic message avoids confirming which part was wrong.
    setResponseStatus(event, 400);
    return { error: "Invalid code." };
  }

  // Consume the code so it cannot be replayed, then create the account here.
  pendingOtps.delete(email);
  return { ok: true, verified: true, email };
});
