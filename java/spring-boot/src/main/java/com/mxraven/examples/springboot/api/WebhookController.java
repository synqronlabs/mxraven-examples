package com.mxraven.examples.springboot.api;

import com.mxraven.examples.springboot.services.EventStore;
import com.mxraven.mail.mime.ParsedEmail;
import com.mxraven.mail.webhook.DeliveryStatus;
import com.mxraven.mail.webhook.InboundEmail;
import com.mxraven.mail.webhook.StorageStatus;
import com.mxraven.mail.webhook.WebhookCallbacks;
import com.mxraven.mail.webhook.WebhookHandler;
import com.mxraven.mail.webhook.WebhookResult;
import com.mxraven.mail.webhook.WebhookVerifier;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Receives verified mxRaven webhook deliveries and lists recent events. */
@RestController
public class WebhookController {

    @Value("${MXRAVEN_WEBHOOK_SECRET:}")
    private String webhookSecret;

    private final EventStore events;
    private volatile WebhookHandler handler;

    public WebhookController(EventStore events) {
        this.events = events;
    }

    /** POST /api/webhook: the exact body bytes and public URL are verified. */
    @PostMapping("/api/webhook")
    public ResponseEntity<Void> receive(HttpServletRequest request, @RequestBody byte[] body) {
        String secret = webhookSecret;
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("Set MXRAVEN_WEBHOOK_SECRET in .env.");
        }

        WebhookResult result = handler(secret).handle(
                request.getMethod(),
                URI.create(request.getRequestURL().toString()),
                headers(request),
                body);
        return ResponseEntity.status(result.status()).build();
    }

    /** GET /api/webhook/events: recent events, newest first. */
    @GetMapping("/api/webhook/events")
    public List<EventStore.StoredEvent> events() {
        return events.recent();
    }

    private WebhookHandler handler(String secret) {
        WebhookHandler existing = handler;
        if (existing != null) {
            return existing;
        }
        synchronized (this) {
            if (handler == null) {
                WebhookVerifier verifier = WebhookVerifier.builder().secret(secret).build();
                handler = WebhookHandler.builder()
                        .verifier(verifier)
                        .listener(new WebhookCallbacks() {
                            @Override
                            public void onInboundEmail(InboundEmail email) {
                                try {
                                    // parse() downloads and parses the raw MIME message.
                                    ParsedEmail parsed = email.parse();
                                    events.record("inbound_email", "\"" + parsed.subject() + "\" from "
                                            + parsed.from() + " - " + parsed.attachments().size()
                                            + " attachment(s)");
                                } catch (IOException e) {
                                    throw new UncheckedIOException(e);
                                }
                            }

                            @Override
                            public void onDeliveryStatus(DeliveryStatus status) {
                                events.record("delivery_status",
                                        status.status().wire() + " - task=" + status.taskId());
                            }

                            @Override
                            public void onStorageStatus(StorageStatus status) {
                                events.record("s3_egress_status",
                                        status.status().wire() + " - object=" + status.objectKey());
                            }
                        })
                        .build();
            }
            return handler;
        }
    }

    private static Map<String, String> headers(HttpServletRequest request) {
        Map<String, String> headers = new LinkedHashMap<>();
        Enumeration<String> names = request.getHeaderNames();
        while (names.hasMoreElements()) {
            String name = names.nextElement();
            headers.put(name, request.getHeader(name));
        }
        return headers;
    }
}
