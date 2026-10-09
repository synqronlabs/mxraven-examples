import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { Client, Message, SMTPError } from "@mxraven/mail";

export const signupRouter = Router();

/**
 * A minimal in-memory store for the demo. Production signup flows should keep
 * pending codes in a database or cache, scoped per account, with rate limits.
 */
const otpTtlMs = 10 * 60 * 1000;
const maxAttempts = 5;

// Anchored on globalThis so pending codes survive `node --watch` reloads.
const globalStore = globalThis;
const pendingOtps = (globalStore.__mxravenOtps ??= new Map());

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function hashOtp(email, otp) {
  return createHash("sha256").update(`${email}:${otp}`).digest("hex");
}

function codeMatches(email, otp, expected) {
  const provided = Buffer.from(hashOtp(email, otp), "hex");
  const stored = Buffer.from(expected, "hex");
  return provided.length === stored.length && timingSafeEqual(provided, stored);
}

function mailClient() {
  const host = process.env.MXRAVEN_HOST;
  const username = process.env.MXRAVEN_USERNAME;
  const secret = process.env.MXRAVEN_SECRET;
  if (host === undefined || username === undefined || secret === undefined) {
    throw new Error("Set MXRAVEN_HOST, MXRAVEN_USERNAME, and MXRAVEN_SECRET in .env.");
  }
  return new Client({
    host,
    port: Number(process.env.MXRAVEN_PORT ?? 587),
    username,
    secret,
  });
}

/**
 * POST /api/signup/request-otp
 *
 * Generates a 6-digit one-time code, stores only its hash, and emails the code
 * with `@mxraven/mail`. The code is never returned in the response.
 *
 * curl -s localhost:3000/api/signup/request-otp -H 'Content-Type: application/json' \
 *   -d '{"email":"you@example.com","name":"Ada"}'
 */
signupRouter.post("/request-otp", async (req, res) => {
  const body = req.body;
  const email = normalizeEmail(body.email);
  if (email === "" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    res.status(400).json({ error: "`email` is required and must be a valid address." });
    return;
  }
  const name = typeof body.name === "string" && body.name.trim() !== "" ? body.name.trim() : "there";

  const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
  pendingOtps.set(email, {
    hash: hashOtp(email, otp),
    expiresAt: Date.now() + otpTtlMs,
    attempts: 0,
  });

  // Local development convenience only; never log codes in production.
  console.log(`[signup] OTP for ${email}: ${otp}`);

  let client;
  try {
    client = mailClient();
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Mail is not configured." });
    return;
  }

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
    res.json({ ok: true, messageRef: result.messageRef, expiresInSeconds: otpTtlMs / 1000 });
  } catch (error) {
    if (error instanceof SMTPError) {
      res
        .status(error.permanent ? 502 : 503)
        .json({ error: error.message, code: error.code, permanent: error.permanent });
      return;
    }
    res.status(500).json({ error: error instanceof Error ? error.message : "Send failed." });
  } finally {
    await client.close();
  }
});

/**
 * POST /api/signup/verify-otp
 *
 * Verifies the code with a constant-time comparison, limits attempts, and
 * consumes the code on success.
 *
 * curl -s localhost:3000/api/signup/verify-otp -H 'Content-Type: application/json' \
 *   -d '{"email":"you@example.com","otp":"123456"}'
 */
signupRouter.post("/verify-otp", (req, res) => {
  const body = req.body;
  const email = normalizeEmail(body.email);
  const otp = typeof body.otp === "string" ? body.otp.trim() : "";

  if (email === "" || otp === "") {
    res.status(400).json({ error: "`email` and `otp` are required." });
    return;
  }

  const pending = pendingOtps.get(email);
  if (pending === undefined) {
    res.status(400).json({ error: "No pending code for this address. Request a new one." });
    return;
  }

  if (Date.now() > pending.expiresAt) {
    pendingOtps.delete(email);
    res.status(400).json({ error: "The code expired. Request a new one." });
    return;
  }

  if (pending.attempts >= maxAttempts) {
    pendingOtps.delete(email);
    res.status(429).json({ error: "Too many attempts. Request a new code." });
    return;
  }

  if (!codeMatches(email, otp, pending.hash)) {
    pending.attempts += 1;
    // A generic message avoids confirming which part was wrong.
    res.status(400).json({ error: "Invalid code." });
    return;
  }

  // Consume the code so it cannot be replayed, then create the account here.
  pendingOtps.delete(email);
  res.json({ ok: true, verified: true, email });
});
