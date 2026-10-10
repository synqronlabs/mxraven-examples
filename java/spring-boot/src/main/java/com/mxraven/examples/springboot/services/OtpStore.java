package com.mxraven.examples.springboot.services;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * A minimal in-memory store for signup codes. Only the SHA-256 hash of
 * email + code is kept; codes expire after 10 minutes and allow 5 attempts.
 * Production flows should use a database or cache with rate limits.
 */
@Service
public class OtpStore {

    private static final Duration TTL = Duration.ofMinutes(10);
    private static final int MAX_ATTEMPTS = 5;

    private final Map<String, Pending> pending = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    private static final class Pending {
        final String hash;
        final Instant expiresAt;
        int attempts;

        Pending(String hash, Instant expiresAt) {
            this.hash = hash;
            this.expiresAt = expiresAt;
        }
    }

    /** The outcome of a verification attempt. */
    public record Verification(boolean ok, int status, String error) {

        public static Verification success() {
            return new Verification(true, 200, null);
        }

        public static Verification failure(int status, String error) {
            return new Verification(false, status, error);
        }
    }

    /** Generates a 6-digit code, stores its hash, and returns the code. */
    public String create(String email) {
        String code = String.format("%06d", random.nextInt(1_000_000));
        pending.put(email, new Pending(hash(email, code), Instant.now().plus(TTL)));
        return code;
    }

    /** Verifies a code in constant time, limits attempts, and consumes it. */
    public Verification verify(String email, String code) {
        Pending entry = pending.get(email);
        if (entry == null) {
            return Verification.failure(400, "No pending code for this address. Request a new one.");
        }

        synchronized (entry) {
            if (Instant.now().isAfter(entry.expiresAt)) {
                pending.remove(email);
                return Verification.failure(400, "The code expired. Request a new one.");
            }
            if (entry.attempts >= MAX_ATTEMPTS) {
                pending.remove(email);
                return Verification.failure(429, "Too many attempts. Request a new code.");
            }

            byte[] provided = HexFormat.of().parseHex(hash(email, code));
            byte[] stored = HexFormat.of().parseHex(entry.hash);
            if (!MessageDigest.isEqual(provided, stored)) {
                entry.attempts += 1;
                // A generic message avoids confirming which part was wrong.
                return Verification.failure(400, "Invalid code.");
            }

            // Consume the code so it cannot be replayed, then create the account.
            pending.remove(email);
            return Verification.success();
        }
    }

    private static String hash(String email, String code) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest((email + ":" + code).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
