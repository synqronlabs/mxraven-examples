package com.mxraven.examples.plain.examples;

import com.mxraven.examples.plain.SampleEmail;
import com.mxraven.mail.mime.Attachment;
import com.mxraven.mail.mime.ParsedEmail;
import com.mxraven.mail.model.MailboxAddress;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Collectors;

/** Parses a raw RFC 5322 / MIME message into headers, bodies, and attachments. */
public final class ParseInboundExample {

    private ParseInboundExample() {
    }

    public static void main(String[] args) throws IOException {
        byte[] raw;
        if (args.length >= 1) {
            raw = Files.readAllBytes(Path.of(args[0]));
        } else {
            System.out.println("No file given; parsing the built-in sample message.\n");
            raw = SampleEmail.bytes();
        }
        parse(raw);
    }

    /** Parses the bytes and prints the common headers, bodies, and attachments. */
    public static void parse(byte[] raw) {
        ParsedEmail email = ParsedEmail.parse(raw);

        System.out.println("Subject:     " + email.subject());
        System.out.println("From:        " + addresses(email.from()));
        System.out.println("To:          " + addresses(email.to()));
        email.messageId().ifPresent(id -> System.out.println("Message-ID:  " + id));
        System.out.println("Attachments: " + email.attachments().size());
        for (Attachment attachment : email.attachments()) {
            System.out.println("  - " + attachment.filename() + " " + attachment.contentType()
                    + " (" + attachment.size() + " bytes)");
        }
        email.textBody().ifPresent(text -> System.out.println("Text:        " + quote(text.trim())));
    }

    private static String addresses(List<MailboxAddress> mailboxes) {
        return mailboxes.stream().map(MailboxAddress::toString).collect(Collectors.joining(", "));
    }

    private static String quote(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
