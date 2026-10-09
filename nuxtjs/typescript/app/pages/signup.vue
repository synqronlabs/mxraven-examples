<script setup lang="ts">
import ExamplePage from "~/components/ExamplePage.vue";
import ResultPanel from "~/components/ResultPanel.vue";
import { buttonClass, inputClass, useExampleRequest } from "~/composables/useExampleRequest";

const { state: requestState, run: runRequest } = useExampleRequest();
const { state: verifyState, run: runVerify } = useExampleRequest();
const email = ref("ada@example.com");
const name = ref("Ada");
const otp = ref("");

function onRequest(): void {
  void runRequest(() =>
    fetch("/api/signup/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value, name: name.value }),
    }),
  );
}

function onVerify(): void {
  void runVerify(() =>
    fetch("/api/signup/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value, otp: otp.value }),
    }),
  );
}

const requestCode = `import { createHash, randomInt } from "node:crypto";
import { Client, Message, SMTPError } from "@mxraven/mail";

interface PendingOtp {
  hash: string;
  expiresAt: number;
  attempts: number;
}

// Anchored on globalThis so pending codes survive dev-server module reloads.
const globalStore = globalThis as typeof globalThis & { __mxravenOtps?: Map<string, PendingOtp> };
const pendingOtps = (globalStore.__mxravenOtps ??= new Map<string, PendingOtp>());

export default defineEventHandler(async (event) => {
  const { email, name = "there" } = await readBody(event);

  // A CSPRNG code; only its hash is stored and it is never returned.
  const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
  pendingOtps.set(email, {
    hash: createHash("sha256").update(\`\${email}:\${otp}\`).digest("hex"),
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0,
  });

  // Local development convenience only; never log codes in production.
  console.log(\`[signup] OTP for \${email}: \${otp}\`);

  const client = new Client({
    host: process.env.MXRAVEN_HOST!,
    username: process.env.MXRAVEN_USERNAME!,
    secret: process.env.MXRAVEN_SECRET!,
  });

  const message = new Message()
    .from(\`Acme <\${process.env.MXRAVEN_MAIL_FROM}>\`)
    .to(email)
    .subject("Your verification code")
    .text(\`Hi \${name},\\n\\nYour verification code is \${otp}. It expires in 10 minutes.\`);

  try {
    const result = await client.send(message);
    return { ok: true, messageRef: result.messageRef, expiresInSeconds: 600 };
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
});`;

const verifyCode = `import { timingSafeEqual } from "node:crypto";

function codeMatches(email: string, otp: string, expected: string): boolean {
  const provided = Buffer.from(hashOtp(email, otp), "hex");
  const stored = Buffer.from(expected, "hex");
  return provided.length === stored.length && timingSafeEqual(provided, stored);
}

export default defineEventHandler(async (event) => {
  const { email, otp } = await readBody(event);

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
  if (pending.attempts >= 5) {
    pendingOtps.delete(email);
    setResponseStatus(event, 429);
    return { error: "Too many attempts. Request a new code." };
  }
  if (!codeMatches(email, otp, pending.hash)) {
    pending.attempts += 1;
    setResponseStatus(event, 400);
    return { error: "Invalid code." };
  }

  // Consume the code so it cannot be replayed, then create the account here.
  pendingOtps.delete(email);
  return { ok: true, verified: true, email };
});`;
</script>

<template>
  <ExamplePage
    title="Signup verification"
    description="A two-step signup flow: request a one-time code by email, then verify it. Only a SHA-256 hash of the code is stored, in an in-memory Map with a 10 minute TTL and a five attempt limit. The code is never returned in a response; for local testing it is printed to the server console."
    :snippets="[
      { title: 'Request', label: 'server/api/signup/request-otp.post.ts', code: requestCode },
      { title: 'Verify', label: 'server/api/signup/verify-otp.post.ts', code: verifyCode },
    ]"
  >
    <div class="flex flex-col gap-8">
      <section class="flex flex-col gap-4">
        <h3 class="text-sm font-semibold">Step 1. Request a code</h3>
        <form class="flex flex-col gap-4" @submit.prevent="onRequest">
          <label class="flex flex-col gap-1 text-sm font-medium">
            <span>Email</span>
            <input v-model="email" type="email" required placeholder="you@example.com" :class="inputClass" />
          </label>
          <label class="flex flex-col gap-1 text-sm font-medium">
            <span>Name<span class="ml-2 font-normal text-zinc-500">optional</span></span>
            <input v-model="name" :class="inputClass" />
          </label>
          <button type="submit" :disabled="requestState.status === 'running'" :class="buttonClass">
            Send code
          </button>
          <ResultPanel :state="requestState" />
        </form>
      </section>

      <section class="flex flex-col gap-4">
        <h3 class="text-sm font-semibold">Step 2. Verify the code</h3>
        <form class="flex flex-col gap-4" @submit.prevent="onVerify">
          <label class="flex flex-col gap-1 text-sm font-medium">
            <span>Code<span class="ml-2 font-normal text-zinc-500">6 digits from the email</span></span>
            <input
              v-model="otp"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              placeholder="123456"
              :class="`${inputClass} font-mono tracking-widest`"
            />
          </label>
          <button type="submit" :disabled="verifyState.status === 'running'" :class="buttonClass">
            Verify code
          </button>
          <ResultPanel :state="verifyState" />
        </form>
      </section>
    </div>
  </ExamplePage>
</template>
