package com.mxraven.examples.springboot.api;

import com.mxraven.examples.springboot.templates.WelcomeTemplate;
import com.mxraven.mail.SmtpClient;
import com.mxraven.mail.SmtpConfig;
import com.mxraven.mail.model.MailBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

/** POST /api/send-template: rendered from a plain template. */
@RestController
public class SendTemplateController {

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

    public record SendTemplateRequest(String to, String name) {
    }

    @PostMapping("/api/send-template")
    public SendSummary send(@RequestBody SendTemplateRequest request) throws IOException {
        if (request.to() == null || request.to().isBlank()) {
            throw new IllegalArgumentException("`to` is required.");
        }
        String name = request.name() == null || request.name().isBlank() ? "there" : request.name();

        WelcomeTemplate.Rendered rendered = WelcomeTemplate.render(name);
        MailBuilder builder = MailBuilder.create()
                .from(mailFrom)
                .to(request.to())
                .subject(rendered.subject())
                .textBody(rendered.text())
                .htmlBody(rendered.html());

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
