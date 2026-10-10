package com.mxraven.examples.plain.examples;

import com.mxraven.examples.plain.Env;
import com.mxraven.mail.mime.ParsedEmail;
import com.mxraven.mail.webhook.DeliveryStatus;
import com.mxraven.mail.webhook.InboundEmail;
import com.mxraven.mail.webhook.StorageStatus;
import com.mxraven.mail.webhook.WebhookCallbacks;
import com.mxraven.mail.webhook.WebhookHandler;
import com.mxraven.mail.webhook.WebhookServer;
import com.mxraven.mail.webhook.WebhookVerifier;

import java.io.IOException;
import java.io.UncheckedIOException;

/** A standalone HTTP listener for verified mxRaven webhook deliveries. */
public final class WebhookExample {

    private WebhookExample() {
    }

    public static void main(String[] args) throws Exception {
        int port = Env.port("WEBHOOK_PORT", 3000);

        WebhookVerifier verifier = WebhookVerifier.builder()
                .secret(Env.require("MXRAVEN_WEBHOOK_SECRET"))
                .build();

        WebhookHandler handler = WebhookHandler.builder()
                .verifier(verifier)
                .listener(new WebhookCallbacks() {
                    @Override
                    public void onInboundEmail(InboundEmail email) {
                        try {
                            // parse() downloads and parses the raw MIME message.
                            ParsedEmail parsed = email.parse();
                            System.out.println("[inbound_email] task=" + email.taskId()
                                    + " subject=\"" + parsed.subject() + "\""
                                    + " attachments=" + parsed.attachments().size());
                        } catch (IOException e) {
                            throw new UncheckedIOException(e);
                        }
                    }

                    @Override
                    public void onDeliveryStatus(DeliveryStatus status) {
                        System.out.println("[delivery_status] task=" + status.taskId()
                                + " status=" + status.status().wire()
                                + " smtp=" + status.smtpCode() + " " + status.enhancedStatusCode());
                    }

                    @Override
                    public void onStorageStatus(StorageStatus status) {
                        System.out.println("[s3_egress_status] task=" + status.taskId()
                                + " status=" + status.status().wire()
                                + " object=" + status.objectKey());
                    }
                })
                .build();

        try (WebhookServer server = WebhookServer.builder()
                .port(port)
                .path("/webhook")
                .handler(handler)
                .banner(false)
                .build()) {
            server.start();
            System.out.println("mxRaven webhook listening on http://127.0.0.1:" + server.port() + "/webhook");
            System.out.println("Press Ctrl+C to stop.");
            // Block the main thread; Ctrl+C shuts the process down.
            Thread.currentThread().join();
        }
    }
}
