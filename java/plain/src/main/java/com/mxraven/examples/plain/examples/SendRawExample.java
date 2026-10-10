package com.mxraven.examples.plain.examples;

import com.mxraven.examples.plain.Env;
import com.mxraven.mail.SendResult;
import com.mxraven.mail.SmtpClient;
import com.mxraven.mail.SmtpConfig;
import com.mxraven.mail.model.DSNRecipientParams;
import com.mxraven.mail.model.Envelope;
import com.mxraven.mail.model.Path;
import com.mxraven.mail.model.Recipient;

import java.nio.charset.StandardCharsets;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** Sends serialized RFC 5322 bytes with an explicit envelope. */
public final class SendRawExample {

    private SendRawExample() {
    }

    public static void main(String[] args) {
        if (args.length < 1) {
            System.err.println("Usage: send-raw <to>");
            System.exit(1);
        }
        try {
            run(args[0]);
        } catch (Exception e) {
            System.err.println("send-raw failed: " + e.getMessage());
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

        String from = Env.require("MXRAVEN_MAIL_FROM");
        byte[] raw = rawMessage(from, to);

        Envelope envelope = Envelope.builder()
                .from(Path.of(from))
                // Per-recipient DSN: NOTIFY=FAILURE,DELAY and ORCPT=rfc822;<to>.
                .to(List.of(new Recipient(Path.of(to),
                        new DSNRecipientParams(List.of("FAILURE", "DELAY"), "rfc822;" + to))))
                .build();

        // sendRaw does not add Date, Message-ID, or MIME-Version: the bytes
        // above already carry them.
        try (SmtpClient client = SmtpClient.connect(config)) {
            SendResult result = client.sendRaw(envelope, raw);
            System.out.println("Accepted as " + result.messageRef() + " (" + result.message() + ")");
            return result.messageRef();
        }
    }

    private static byte[] rawMessage(String from, String to) {
        String date = DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss Z", Locale.US)
                .format(ZonedDateTime.now(ZoneOffset.UTC));
        return ("From: " + from + "\r\n"
                + "To: " + to + "\r\n"
                + "Subject: Raw message example\r\n"
                + "Date: " + date + "\r\n"
                + "Message-ID: <" + UUID.randomUUID() + "@mxraven.example>\r\n"
                + "MIME-Version: 1.0\r\n"
                + "Content-Type: text/plain; charset=\"utf-8\"\r\n"
                + "\r\n"
                + "These are pre-serialized RFC 5322 bytes.\r\n")
                .getBytes(StandardCharsets.UTF_8);
    }
}
