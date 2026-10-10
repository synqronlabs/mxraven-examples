package com.mxraven.examples.springboot.api;

import com.mxraven.mail.SmtpClient;
import com.mxraven.mail.SmtpConfig;
import com.mxraven.mail.mime.MimeType;
import com.mxraven.mail.model.MailBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

/** POST /api/send-attachments: a CSV attachment and an inline cid: image. */
@RestController
public class SendAttachmentsController {

    /** A 1x1 placeholder PNG; replace it with your own image bytes. */
    private static final byte[] LOGO_PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

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

    public record FilePayload(String filename, String contentType, String dataBase64) {
    }

    public record SendAttachmentsRequest(String to, FilePayload file) {
    }

    @PostMapping("/api/send-attachments")
    public Map<String, Object> send(@RequestBody SendAttachmentsRequest request) throws IOException {
        if (request.to() == null || request.to().isBlank()) {
            throw new IllegalArgumentException("`to` is required.");
        }

        byte[] report = "id,name\n1,Ada Lovelace\n2,Alan Turing\n".getBytes(StandardCharsets.UTF_8);
        MailBuilder builder = MailBuilder.create()
                .from(mailFrom)
                .to(request.to())
                .subject("Your report")
                .textBody("Your report is attached.")
                .htmlBody("<p>Your report is attached.</p><p><img src=\"cid:logo\" alt=\"Acme logo\"></p>")
                .attachFile("report.csv", report, MimeType.TEXT_CSV)
                .attachInline("logo.png", "logo", LOGO_PNG, MimeType.IMAGE_PNG);

        boolean uploaded = request.file() != null
                && request.file().dataBase64() != null
                && !request.file().dataBase64().isBlank();
        if (uploaded) {
            FilePayload file = request.file();
            byte[] data;
            try {
                data = Base64.getDecoder().decode(file.dataBase64());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("`file.dataBase64` is not valid base64.");
            }
            String filename = file.filename() == null || file.filename().isBlank() ? "upload.bin" : file.filename();
            builder.attachFile(filename, data, MimeType.fromFilename(filename));
        }

        try (SmtpClient client = SmtpClient.connect(smtpConfig())) {
            SendSummary summary = SendSummary.of(client.send(builder.build()));
            return Map.of(
                    "messageRef", String.valueOf(summary.messageRef()),
                    "success", summary.success(),
                    "attachments", uploaded ? 3 : 2);
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
