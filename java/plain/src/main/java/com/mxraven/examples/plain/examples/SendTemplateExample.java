package com.mxraven.examples.plain.examples;

import com.mxraven.examples.plain.Env;
import com.mxraven.examples.plain.WelcomeTemplate;
import com.mxraven.examples.plain.WelcomeTemplate.Rendered;
import com.mxraven.mail.SendResult;
import com.mxraven.mail.SmtpClient;
import com.mxraven.mail.SmtpConfig;
import com.mxraven.mail.model.Mail;
import com.mxraven.mail.model.MailBuilder;

/** Sends a message whose bodies come from a plain template renderer. */
public final class SendTemplateExample {

    private SendTemplateExample() {
    }

    public static void main(String[] args) {
        if (args.length < 1) {
            System.err.println("Usage: send-template <to> [name]");
            System.exit(1);
        }
        try {
            run(args[0], args.length > 1 ? args[1] : "Ada");
        } catch (Exception e) {
            System.err.println("send-template failed: " + e.getMessage());
            System.exit(1);
        }
    }

    /** Renders the template and sends it; also called by the all runner. */
    public static String run(String to, String name) throws Exception {
        SmtpConfig config = SmtpConfig.builder()
                .host(Env.require("MXRAVEN_HOST"))
                .port(Env.port("MXRAVEN_PORT", 587))
                .startTls()
                .credentials(Env.require("MXRAVEN_USERNAME"), Env.require("MXRAVEN_SECRET"))
                .build();

        Rendered rendered = new WelcomeTemplate().render(name);
        System.out.println("Template subject: \"" + rendered.subject() + "\" (an explicit subject wins)");

        Mail mail = MailBuilder.create()
                .from(Env.require("MXRAVEN_MAIL_FROM"))
                .to(to)
                // The template rendered a subject too, but this explicit one wins.
                .subject("Welcome from Java")
                .textBody(rendered.text())
                .htmlBody(rendered.html())
                .build();

        try (SmtpClient client = SmtpClient.connect(config)) {
            SendResult result = client.send(mail);
            System.out.println("Accepted as " + result.messageRef() + " (" + result.message() + ")");
            return result.messageRef();
        }
    }
}
