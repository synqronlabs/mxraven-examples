package com.mxraven.examples.plain.examples;

import com.mxraven.examples.plain.Env;
import com.mxraven.mail.SendResult;
import com.mxraven.mail.SmtpClient;
import com.mxraven.mail.SmtpConfig;
import com.mxraven.mail.mime.MimeType;
import com.mxraven.mail.model.Mail;
import com.mxraven.mail.model.MailBuilder;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/** Sends a message with a file attachment and an inline cid: image. */
public final class SendAttachmentsExample {

    /** A 1x1 placeholder PNG; replace it with your own image bytes. */
    private static final byte[] LOGO_PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

    private SendAttachmentsExample() {
    }

    public static void main(String[] args) {
        if (args.length < 1) {
            System.err.println("Usage: send-attachments <to>");
            System.exit(1);
        }
        try {
            run(args[0]);
        } catch (Exception e) {
            System.err.println("send-attachments failed: " + e.getMessage());
            System.exit(1);
        }
    }

    /** Sends the message; also called by the all runner. */
    public static String run(String to) throws Exception {
        SmtpConfig config = SmtpConfig.builder()
                .host(Env.require("MXRAVEN_HOST"))
                .port(Env.port("MXRAVEN_PORT", 587))
                .startTls()
                .credentials(Env.require("MXRAVEN_USERNAME"), Env.require("MXRAVEN_SECRET"))
                .build();

        byte[] report = "id,name\n1,Ada Lovelace\n2,Alan Turing\n".getBytes(StandardCharsets.UTF_8);

        Mail mail = MailBuilder.create()
                .from(Env.require("MXRAVEN_MAIL_FROM"))
                .to(to)
                .subject("Your report")
                .textBody("Your report is attached.")
                .htmlBody("<p>Your report is attached.</p>"
                        + "<p><img src=\"cid:logo\" alt=\"Acme logo\" /></p>")
                .attachFile("report.csv", report, MimeType.TEXT_CSV)
                // The inline part is addressable as cid:logo from the HTML body.
                .attachInline("logo.png", "logo", LOGO_PNG, MimeType.IMAGE_PNG)
                .build();

        try (SmtpClient client = SmtpClient.connect(config)) {
            SendResult result = client.send(mail);
            System.out.println("Accepted as " + result.messageRef() + " (2 attachments)");
            return result.messageRef();
        }
    }
}
