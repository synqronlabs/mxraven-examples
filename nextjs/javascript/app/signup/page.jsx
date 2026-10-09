import { ExamplePage } from "@/components/example-page";
import { SignupForm } from "./signup-form";

export const metadata = {
  title: "Signup OTP | mxRaven examples",
};

const request = `import { Client, Message, SMTPError } from "@mxraven/mail";
import { createOtp, normalizeEmail, otpTtlMs } from "@/lib/otp";

export async function POST(request) {
  const { email: rawEmail, name = "there" } = await request.json();

  const email = normalizeEmail(rawEmail);
  if (email === "") {
    return Response.json({ error: "\`email\` is required." }, { status: 400 });
  }

  // Generates the code and stores only its SHA-256 hash (10 minute TTL).
  const otp = createOtp(email);

  const client = new Client({
    host: process.env.MXRAVEN_HOST,
    username: process.env.MXRAVEN_USERNAME,
    secret: process.env.MXRAVEN_SECRET,
  });

  const message = new Message()
    .from(\`Acme <\${process.env.MXRAVEN_MAIL_FROM}>\`)
    .to(email)
    .subject("Your verification code")
    .text(\`Hi \${name},\\n\\nYour verification code is \${otp}.\`);

  try {
    const result = await client.send(message);
    return Response.json({ ok: true, messageRef: result.messageRef, expiresInSeconds: otpTtlMs / 1000 });
  } catch (error) {
    if (error instanceof SMTPError) {
      return Response.json({ error: error.message, code: error.code }, { status: 502 });
    }
    throw error;
  } finally {
    await client.close();
  }
}`;

const verify = `import { normalizeEmail, verifyOtp } from "@/lib/otp";

export async function POST(request) {
  const { email: rawEmail, otp } = await request.json();

  const email = normalizeEmail(rawEmail);
  if (email === "" || otp === undefined || otp === "") {
    return Response.json({ error: "\`email\` and \`otp\` are required." }, { status: 400 });
  }

  // Constant-time comparison, attempt limit, and one-time consumption.
  const result = verifyOtp(email, otp);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ ok: true, verified: true, email });
}`;

export default function SignupPage() {
  return (
    <ExamplePage
      title="Signup OTP"
      description="Email a one-time code and verify it. The code is generated with a CSPRNG, only its SHA-256 hash is stored (10 minute TTL, 5 attempts), and it is consumed on success. The code is never returned in the response; for local testing it is printed to the server console."
      snippets={[
        { title: "Request", label: "app/api/signup/request-otp/route.js", code: request },
        { title: "Verify", label: "app/api/signup/verify-otp/route.js", code: verify },
      ]}
    >
      <SignupForm />
    </ExamplePage>
  );
}
