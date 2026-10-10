package com.mxraven.examples.plain.examples;

import com.mxraven.examples.plain.Env;
import com.mxraven.mail.SendResult;
import com.mxraven.mail.SmtpClient;
import com.mxraven.mail.SmtpConfig;
import com.mxraven.mail.model.DSNEnvelopeParams;
import com.mxraven.mail.model.DeliveryBy;
import com.mxraven.mail.model.DeliveryByMode;
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

/** Sends prebuilt bytes with RFC 2852 DELIVERBY and RFC 3461 DSN parameters. */
public final class SendDeliveryByExample {

    private SendDeliveryByExample() {
    }

    public static void main(String[] args) {
        if (args.length < 1) {
            System.err.println("Usage: send-delivery-by <to> [seconds] [envid]");
            System.exit(1);
        }
        try {
            long seconds = args.length > 1 ? Long.parseLong(args[1]) : 3600;
            String envId = args.length > 2 ? args[2] : "java-" + System.currentTimeMillis();
            run(args[0], seconds, envId);
        } catch (Exception e) {
            System.err.println("send-delivery-by failed: " + e.getMessage());
            System.exit(1);
        }
    }

    /** Sends the message; also called by the all runner. */
    public static String run(String to, long seconds, String envId) throws Exception {
        SmtpConfig config = SmtpConfig.builder()
                .host(Env.require("MXRAVEN_HOST"))
                .port(Env.port("MXRAVEN_PORT", 587))
                .startTls()
                .credentials(Env.require("MXRAVEN_USERNAME"), Env.require("MXRAVEN_SECRET"))
                .build();

        String from = Env.require("MXRAVEN_MAIL_FROM");
        Envelope envelope = Envelope.builder()
                .from(Path.of(from))
                .to(List.of(Recipient.of(to)))
                // DELIVERBY: BY=<seconds>;R, return the message at the deadline.
                .deliveryBy(new DeliveryBy(seconds, DeliveryByMode.RETURN, false))
                .dsnParams(new DSNEnvelopeParams("FULL"))   // RET=FULL
                .envId(envId)                               // ENVID tags the transaction
                // Envelope.extensionParams(Map) exists for other MAIL FROM
                // parameters, but servers reject any parameter they do not
                // advertise, so this example only uses DELIVERBY, DSN, and ENVID.
                .build();

        byte[] raw = rawMessage(from, to, seconds);

        try (SmtpClient client = SmtpClient.connect(config)) {
            SendResult result = client.sendRaw(envelope, raw);
            System.out.println("Accepted as " + result.messageRef() + " (envid " + envId + ")");
            return result.messageRef();
        }
    }

    private static byte[] rawMessage(String from, String to, long seconds) {
        String date = DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss Z", Locale.US)
                .format(ZonedDateTime.now(ZoneOffset.UTC));
        return ("From: " + from + "\r\n"
                + "To: " + to + "\r\n"
                + "Subject: Delivery deadline example\r\n"
                + "Date: " + date + "\r\n"
                + "Message-ID: <" + UUID.randomUUID() + "@mxraven.example>\r\n"
                + "MIME-Version: 1.0\r\n"
                + "Content-Type: text/plain; charset=\"utf-8\"\r\n"
                + "\r\n"
                + "This message asks mxRaven to apply a " + seconds + "s DELIVERBY deadline.\r\n")
                .getBytes(StandardCharsets.UTF_8);
    }
}
