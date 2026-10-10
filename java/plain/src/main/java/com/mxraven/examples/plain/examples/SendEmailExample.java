package com.mxraven.examples.plain.examples;

import com.mxraven.examples.plain.Env;
import com.mxraven.mail.SendResult;
import com.mxraven.mail.SmtpClient;
import com.mxraven.mail.SmtpConfig;
import com.mxraven.mail.model.Mail;
import com.mxraven.mail.model.MailBuilder;

/** Sends a plain-text message with an HTML alternative. */
public final class SendEmailExample {

    private SendEmailExample() {
    }

    public static void main(String[] args) {
        if (args.length < 1) {
            System.err.println("Usage: send-email <to>");
            System.exit(1);
        }
        try {
            run(args[0]);
        } catch (Exception e) {
            System.err.println("send-email failed: " + e.getMessage());
            System.exit(1);
        }
    }

    /** Sends one message; also called by the all runner. */
    public static String run(String to) throws Exception {
        SmtpConfig config = SmtpConfig.builder()
                .host(Env.require("MXRAVEN_HOST"))
                .port(Env.port("MXRAVEN_PORT", 587))
                .startTls()
                .credentials(Env.require("MXRAVEN_USERNAME"), Env.require("MXRAVEN_SECRET"))
                .build();

        Mail mail = MailBuilder.create()
                .from(Env.require("MXRAVEN_MAIL_FROM"))
                .to(to)
                .subject("Hello from Java")
                .textBody("This message was sent from a plain Java program with com.mxraven:mail.")
                .htmlBody("<p>This message was sent from a <strong>Java</strong> program "
                        + "with <code>com.mxraven:mail</code>.</p>")
                .build();

        // SmtpClient is AutoCloseable: try-with-resources quits the session.
        try (SmtpClient client = SmtpClient.connect(config)) {
            SendResult result = client.send(mail);
            System.out.println("Accepted as " + result.messageRef() + " (" + result.message() + ")");
            return result.messageRef();
        }
    }
}
