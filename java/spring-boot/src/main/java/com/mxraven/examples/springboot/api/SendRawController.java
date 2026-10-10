package com.mxraven.examples.springboot.api;

import com.mxraven.mail.SendResult;
import com.mxraven.mail.SmtpClient;
import com.mxraven.mail.SmtpConfig;
import com.mxraven.mail.model.DSNRecipientParams;
import com.mxraven.mail.model.Envelope;
import com.mxraven.mail.model.Path;
import com.mxraven.mail.model.Recipient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/** POST /api/send-raw: pre-serialized RFC 5322 bytes with per-recipient DSNs. */
@RestController
public class SendRawController {

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

    public record SendRawRequest(String to, String subject, String text) {
    }

    @PostMapping("/api/send-raw")
    public SendSummary send(@RequestBody SendRawRequest request) throws IOException {
        if (request.to() == null || request.to().isBlank()) {
            throw new IllegalArgumentException("`to` is required.");
        }

        String subject = request.subject() == null || request.subject().isBlank()
                ? "Raw message example"
                : request.subject();
        String text = request.text() == null || request.text().isBlank()
                ? "These are pre-serialized RFC 5322 bytes."
                : request.text();
        byte[] raw = rawMessage(mailFrom, request.to(), subject, text);

        Envelope envelope = Envelope.builder()
                .from(Path.of(mailFrom))
                // Per-recipient DSN options live on the envelope, not the headers.
                .to(List.of(new Recipient(
                        Path.of(request.to()),
                        new DSNRecipientParams(List.of("FAILURE", "DELAY"), "rfc822;" + request.to()))))
                .build();

        try (SmtpClient client = SmtpClient.connect(smtpConfig())) {
            SendResult result = client.sendRaw(envelope, raw);
            return SendSummary.of(result);
        }
    }

    /** Serializes an RFC 5322 message. The caller is responsible for correctness. */
    private static byte[] rawMessage(String from, String to, String subject, String text) {
        String message = "From: " + from + "\r\n"
                + "To: " + to + "\r\n"
                + "Subject: " + subject + "\r\n"
                + "Date: " + DateTimeFormatter.RFC_1123_DATE_TIME.format(ZonedDateTime.now()) + "\r\n"
                + "Message-ID: <" + UUID.randomUUID() + "@mxraven.example>\r\n"
                + "MIME-Version: 1.0\r\n"
                + "Content-Type: text/plain; charset=\"utf-8\"\r\n"
                + "\r\n"
                + text;
        return message.getBytes(StandardCharsets.UTF_8);
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
