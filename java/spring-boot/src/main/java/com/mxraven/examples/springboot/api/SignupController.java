package com.mxraven.examples.springboot.api;

import com.mxraven.examples.springboot.services.OtpStore;
import com.mxraven.mail.SendResult;
import com.mxraven.mail.SmtpClient;
import com.mxraven.mail.SmtpConfig;
import com.mxraven.mail.model.MailBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.Map;
import java.util.regex.Pattern;

/** Signup OTP: email a one-time code, then verify it. */
@RestController
public class SignupController {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    @Value("${MXRAVEN_HOST:}")
    private String host;

    @Value("${MXRAVEN_PORT:587}")
    private int port;

    @Value("${MXRAVEN_USERNAME:}")
    private String username;

    @Value("${MXRAVEN_SECRET:}")
    private String secret;

    @Value("${MXRAVEN_MAIL_FROM:}")
    private String mailFrom;

    private final OtpStore otpStore;

    public SignupController(OtpStore otpStore) {
        this.otpStore = otpStore;
    }

    public record RequestOtpRequest(String email, String name) {
    }

    public record VerifyOtpRequest(String email, String otp) {
    }

    /** POST /api/signup/request-otp: never returns the code. */
    @PostMapping("/api/signup/request-otp")
    public Map<String, Object> requestOtp(@RequestBody RequestOtpRequest request) throws IOException {
        String email = normalize(request.email());
        if (!EMAIL.matcher(email).matches()) {
            throw new IllegalArgumentException("`email` is required and must be a valid address.");
        }
        String name = request.name() == null || request.name().isBlank() ? "there" : request.name().trim();

        // Generates the code and stores only its SHA-256 hash (10 minute TTL).
        String code = otpStore.create(email);
        // Local development convenience only; never log codes in production.
        System.out.println("[signup] OTP for " + email + ": " + code);

        MailBuilder builder = MailBuilder.create()
                .from(mailFrom)
                .to(email)
                .subject("Your verification code")
                .textBody("Hi " + name + ",\n\nYour verification code is " + code
                        + ". It expires in 10 minutes.")
                .htmlBody("<p>Hi " + name + ",</p><p>Your verification code is <strong style=\"font-size: 20px;"
                        + " letter-spacing: 2px;\">" + code + "</strong>.</p>"
                        + "<p>It expires in 10 minutes. If you did not request this, ignore this email.</p>");

        try (SmtpClient client = SmtpClient.connect(smtpConfig())) {
            SendResult result = client.send(builder.build());
            return Map.of(
                    "ok", true,
                    "messageRef", String.valueOf(result.messageRef()),
                    "expiresInSeconds", 600);
        }
    }

    /** POST /api/signup/verify-otp: constant-time compare, consume on success. */
    @PostMapping("/api/signup/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody VerifyOtpRequest request) {
        String email = normalize(request.email());
        String otp = request.otp() == null ? "" : request.otp().trim();
        if (email.isEmpty() || otp.isEmpty()) {
            throw new IllegalArgumentException("`email` and `otp` are required.");
        }

        OtpStore.Verification verification = otpStore.verify(email, otp);
        if (!verification.ok()) {
            return ResponseEntity.status(verification.status())
                    .body(Map.of("error", String.valueOf(verification.error())));
        }
        return ResponseEntity.ok(Map.of("ok", true, "verified", true, "email", email));
    }

    private static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private SmtpConfig smtpConfig() {
        if (host.isBlank() || username.isBlank() || secret.isBlank()) {
            throw new IllegalStateException("Set MXRAVEN_HOST, MXRAVEN_USERNAME, and MXRAVEN_SECRET in .env.");
        }
        return SmtpConfig.builder()
                .host(host)
                .port(port)
                .startTls()
                .credentials(username, secret)
                .build();
    }
}
