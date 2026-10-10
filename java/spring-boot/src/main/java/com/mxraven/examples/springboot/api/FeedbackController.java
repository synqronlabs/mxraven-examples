package com.mxraven.examples.springboot.api;

import com.mxraven.mail.feedback.FeedbackClient;
import com.mxraven.mail.feedback.LearningResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.Base64;
import java.util.Map;

/** Feedback: spam/ham training and one-click unsubscribe. */
@RestController
public class FeedbackController {

    @Value("${MXRAVEN_FEEDBACK_BASE_URL:https://feedback.mxraven.com}")
    private String baseUrl;

    @Value("${MXRAVEN_USERNAME:}")
    private String username;

    @Value("${MXRAVEN_SECRET:}")
    private String secret;

    public record LearnRequest(String label, String rawMimeBase64) {
    }

    public record UnsubscribeRequest(String token) {
    }

    /** POST /api/feedback/learn: train with the exact raw bytes (base64). */
    @PostMapping("/api/feedback/learn")
    public Map<String, Object> learn(@RequestBody LearnRequest request) throws IOException {
        boolean spam = "spam".equalsIgnoreCase(request.label());
        boolean ham = "ham".equalsIgnoreCase(request.label());
        if (!spam && !ham) {
            throw new IllegalArgumentException("`label` must be `spam` or `ham`.");
        }
        if (request.rawMimeBase64() == null || request.rawMimeBase64().isBlank()) {
            throw new IllegalArgumentException("`rawMimeBase64` is required.");
        }
        if (username.isBlank() || secret.isBlank()) {
            throw new IllegalStateException("Set MXRAVEN_USERNAME and MXRAVEN_SECRET in .env.");
        }

        byte[] rawMime;
        try {
            rawMime = Base64.getDecoder().decode(request.rawMimeBase64());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("`rawMimeBase64` is not valid base64.");
        }

        FeedbackClient feedback = FeedbackClient.builder()
                .baseUrl(baseUrl)
                .credentials(username, secret)
                .build();
        LearningResult result = spam ? feedback.learnSpam(rawMime) : feedback.learnHam(rawMime);

        return Map.of(
                "status", String.valueOf(result.status()),
                "disposition", result.disposition().name(),
                "tenantId", String.valueOf(result.tenantId()),
                "matchedHashKind", String.valueOf(result.matchedHashKind()));
    }

    /** POST /api/feedback/unsubscribe: RFC 8058 one-click unsubscribe. */
    @PostMapping("/api/feedback/unsubscribe")
    public Map<String, Object> unsubscribe(@RequestBody UnsubscribeRequest request) throws IOException {
        if (request.token() == null || request.token().isBlank()) {
            throw new IllegalArgumentException("`token` is required.");
        }

        FeedbackClient feedback = FeedbackClient.builder().baseUrl(baseUrl).build();
        feedback.unsubscribe(request.token());
        return Map.of("ok", true);
    }
}
