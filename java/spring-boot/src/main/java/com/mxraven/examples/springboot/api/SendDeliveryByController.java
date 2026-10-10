package com.mxraven.examples.springboot.api;

import com.mxraven.mail.SendResult;
import com.mxraven.mail.SmtpClient;
import com.mxraven.mail.SmtpConfig;
import com.mxraven.mail.model.DeliveryBy;
import com.mxraven.mail.model.DeliveryByMode;
import com.mxraven.mail.model.DSNEnvelopeParams;
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
import java.util.Map;
import java.util.UUID;

/** POST /api/send-delivery-by: DELIVERBY and DSN envelope parameters. */
@RestController
public class SendDeliveryByController {

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

    public record SendDeliveryByRequest(String to, Long seconds, String mode, String envid) {
    }

    @PostMapping("/api/send-delivery-by")
    public Map<String, Object> send(@RequestBody SendDeliveryByRequest request) throws IOException {
        if (request.to() == null || request.to().isBlank()) {
            throw new IllegalArgumentException("`to` is required.");
        }

        long seconds = request.seconds() == null || request.seconds() <= 0 ? 3600 : request.seconds();
        boolean notify = "N".equalsIgnoreCase(request.mode());
        DeliveryByMode mode = notify ? DeliveryByMode.NOTIFY : DeliveryByMode.RETURN;
        String envid = request.envid() == null || request.envid().isBlank()
                ? "spring-" + System.currentTimeMillis()
                : request.envid();

        byte[] raw = rawMessage(mailFrom, request.to(), "Delivery deadline example",
                "This message asks mxRaven to apply a " + seconds + "s DELIVERBY deadline (mode "
                        + mode.wire() + ").");

        // Note: Envelope.extensionParams can add other MAIL FROM parameters, but
        // servers reject any parameter they do not advertise.
        Envelope envelope = Envelope.builder()
                .from(Path.of(mailFrom))
                .to(List.of(Recipient.of(request.to())))
                .deliveryBy(new DeliveryBy(seconds, mode, false))
                .dsnParams(new DSNEnvelopeParams("FULL"))
                .envId(envid)
                .build();

        try (SmtpClient client = SmtpClient.connect(smtpConfig())) {
            SendResult result = client.sendRaw(envelope, raw);
            return Map.of(
                    "messageRef", String.valueOf(result.messageRef()),
                    "success", result.success(),
                    "seconds", seconds,
                    "mode", mode.wire(),
                    "envid", envid);
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
