import { createHash, randomInt, timingSafeEqual } from "node:crypto";

/** A pending one-time code. Only the hash is kept, never the code itself. */
export interface PendingOtp {
  hash: string;
  expiresAt: number;
  attempts: number;
}

export const otpTtlMs = 10 * 60 * 1000;
export const maxOtpAttempts = 5;

/**
 * A minimal in-memory store for the demo. Production signup flows should keep
 * pending codes in a database or cache, scoped per account, with rate limits.
 *
 * Anchored on globalThis so pending codes survive dev reloads.
 */
const globalStore = globalThis as typeof globalThis & { __mxravenOtps?: Map<string, PendingOtp> };
const pendingOtps = (globalStore.__mxravenOtps ??= new Map<string, PendingOtp>());

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function hashOtp(email: string, otp: string): string {
  return createHash("sha256").update(`${email}:${otp}`).digest("hex");
}

/** Generates a 6-digit code, stores its hash, and returns the code. */
export function createOtp(email: string): string {
  const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
  pendingOtps.set(email, {
    hash: hashOtp(email, otp),
    expiresAt: Date.now() + otpTtlMs,
    attempts: 0,
  });
  return otp;
}

export type VerifyOtpResult = { ok: true } | { ok: false; status: number; error: string };

/** Verifies a code in constant time, limits attempts, and consumes it. */
export function verifyOtp(email: string, otp: string): VerifyOtpResult {
  const pending = pendingOtps.get(email);
  if (pending === undefined) {
    return { ok: false, status: 400, error: "No pending code for this address. Request a new one." };
  }

  if (Date.now() > pending.expiresAt) {
    pendingOtps.delete(email);
    return { ok: false, status: 400, error: "The code expired. Request a new one." };
  }

  if (pending.attempts >= maxOtpAttempts) {
    pendingOtps.delete(email);
    return { ok: false, status: 429, error: "Too many attempts. Request a new code." };
  }

  const provided = Buffer.from(hashOtp(email, otp), "hex");
  const stored = Buffer.from(pending.hash, "hex");
  if (provided.length !== stored.length || !timingSafeEqual(provided, stored)) {
    pending.attempts += 1;
    // A generic message avoids confirming which part was wrong.
    return { ok: false, status: 400, error: "Invalid code." };
  }

  // Consume the code so it cannot be replayed, then create the account here.
  pendingOtps.delete(email);
  return { ok: true };
}
