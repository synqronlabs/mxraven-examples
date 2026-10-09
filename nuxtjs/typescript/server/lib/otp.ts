import { createHash, randomInt, timingSafeEqual } from "node:crypto";

/**
 * A minimal in-memory store for the demo. Production signup flows should keep
 * pending codes in a database or cache, scoped per account, with rate limits.
 */
export interface PendingOtp {
  hash: string;
  expiresAt: number;
  attempts: number;
}

export const otpTtlMs = 10 * 60 * 1000;
export const maxAttempts = 5;

// Anchored on globalThis so pending codes survive dev-server module reloads.
const globalStore = globalThis as typeof globalThis & { __mxravenOtps?: Map<string, PendingOtp> };
export const pendingOtps = (globalStore.__mxravenOtps ??= new Map<string, PendingOtp>());

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function hashOtp(email: string, otp: string): string {
  return createHash("sha256").update(`${email}:${otp}`).digest("hex");
}

export function codeMatches(email: string, otp: string, expected: string): boolean {
  const provided = Buffer.from(hashOtp(email, otp), "hex");
  const stored = Buffer.from(expected, "hex");
  return provided.length === stored.length && timingSafeEqual(provided, stored);
}

/** Generates a 6-digit code with a CSPRNG and stores only its hash. */
export function issueOtp(email: string): string {
  const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
  pendingOtps.set(email, {
    hash: hashOtp(email, otp),
    expiresAt: Date.now() + otpTtlMs,
    attempts: 0,
  });
  return otp;
}
