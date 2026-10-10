package com.mxraven.examples.springboot.api;

import com.mxraven.mail.SmtpClient;
import com.mxraven.mail.SmtpConfig;
import com.mxraven.mail.model.MailBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

/** POST /api/send-email: plain text plus an optional HTML alternative. */
@RestController
public class SendEmailController {

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

    public record SendEmailRequest(String to, String subject, String text, String html) {
    }

    @PostMapping("/api/send-email")
    public SendSummary send(@RequestBody SendEmailRequest request) throws IOException {
        if (request.to() == null || request.to().isBlank()) {
            throw new IllegalArgumentException("`to` is required.");
        }

        MailBuilder builder = MailBuilder.create()
                // `Name <address>` sets the display name on the From header.
                .from(mailFrom)
                .to(request.to())
                .subject(request.subject() == null || request.subject().isBlank()
                        ? "Hello from mxRaven"
                        : request.subject())
                .textBody(request.text() == null || request.text().isBlank()
                        ? "This message was sent with com.mxraven:mail."
                        : request.text());

        // Setting both bodies sends multipart/alternative.
        if (request.html() != null && !request.html().isBlank()) {
            builder.htmlBody(request.html());
        }

        // SmtpClient is AutoCloseable: try-with-resources quits the session.
        try (SmtpClient client = SmtpClient.connect(smtpConfig())) {
            return SendSummary.of(client.send(builder.build()));
        }
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
