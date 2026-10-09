import { normalizeEmail, verifyOtp } from "@/lib/otp";

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
export async function POST(request: Request): Promise<Response> {
  let body: VerifyOtpBody;
  try {
    body = (await request.json()) as VerifyOtpBody;
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const otp = typeof body.otp === "string" ? body.otp.trim() : "";
  if (email === "" || otp === "") {
    return Response.json({ error: "`email` and `otp` are required." }, { status: 400 });
  }

  const result = verifyOtp(email, otp);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ ok: true, verified: true, email });
}
