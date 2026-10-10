package com.mxraven.examples.plain.examples;

import com.mxraven.examples.plain.Env;
import com.mxraven.mail.feedback.Disposition;
import com.mxraven.mail.feedback.FeedbackClient;
import com.mxraven.mail.feedback.FeedbackException;
import com.mxraven.mail.feedback.LearningResult;

import java.nio.file.Files;
import java.nio.file.Path;

/** Trains the spam filter with raw message bytes and performs one-click unsubscribe. */
public final class FeedbackExample {

    private FeedbackExample() {
    }

    public static void main(String[] args) {
        if (args.length < 2) {
            System.err.println("Usage: feedback <spam|ham> <file.eml>");
            System.err.println("       feedback unsubscribe <token>");
            System.exit(1);
        }
        try {
            switch (args[0]) {
                case "spam" -> learn(Disposition.SPAM, args[1]);
                case "ham" -> learn(Disposition.HAM, args[1]);
                case "unsubscribe" -> unsubscribe(args[1]);
                default -> {
                    System.err.println("Unknown feedback command: " + args[0]);
                    System.exit(1);
                }
            }
        } catch (FeedbackException e) {
            System.err.println("feedback failed: " + e.statusCode() + " " + e.detail()
                    + (e.retryable() ? " (retryable)" : ""));
            System.exit(1);
        } catch (Exception e) {
            System.err.println("feedback failed: " + e.getMessage());
            System.exit(1);
        }
    }

    /** Submits the exact raw bytes mxRaven processed; the service matches them by SHA-256. */
    public static void learn(Disposition disposition, String path) throws Exception {
        byte[] raw = Files.readAllBytes(Path.of(path));
        FeedbackClient feedback = FeedbackClient.builder()
                .baseUrl(baseUrl())
                .credentials(Env.require("MXRAVEN_USERNAME"), Env.require("MXRAVEN_SECRET"))
                .build();

        LearningResult result = disposition == Disposition.SPAM
                ? feedback.learnSpam(raw)
                : feedback.learnHam(raw);
        System.out.println("Learned " + result.disposition() + " (tenant " + result.tenantId()
                + ", matched " + result.matchedHashKind() + ")");
    }

    /** RFC 8058 one-click unsubscribe; this endpoint needs no credentials. */
    public static void unsubscribe(String token) throws Exception {
        FeedbackClient feedback = FeedbackClient.builder()
                .baseUrl(baseUrl())
                .build();
        feedback.unsubscribe(token);
        System.out.println("Unsubscribed.");
    }

    private static String baseUrl() {
        String value = Env.get("MXRAVEN_FEEDBACK_BASE_URL");
        return value == null || value.isBlank() ? "https://feedback.mxraven.com" : value;
    }
}
