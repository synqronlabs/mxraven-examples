package com.mxraven.examples.plain;

import java.nio.charset.StandardCharsets;

/** The raw MIME fixture shared with the other mxRaven examples stacks. */
public final class SampleEmail {

    public static final String TEXT = """
            From: Ada <ada@example.com>
            To: inbox@example.com
            Subject: Hello mxRaven
            Date: Fri, 09 Oct 2026 10:00:00 +0000
            Message-ID: <sample@example.com>
            MIME-Version: 1.0
            Content-Type: multipart/mixed; boundary="b"

            --b
            Content-Type: text/plain; charset="utf-8"

            Hello from the parser.
            --b
            Content-Type: application/octet-stream; name="hello.txt"
            Content-Disposition: attachment; filename="hello.txt"
            Content-Transfer-Encoding: base64

            aGVsbG8=
            --b--
            """;

    private SampleEmail() {
    }

    public static byte[] bytes() {
        return TEXT.getBytes(StandardCharsets.UTF_8);
    }
}
