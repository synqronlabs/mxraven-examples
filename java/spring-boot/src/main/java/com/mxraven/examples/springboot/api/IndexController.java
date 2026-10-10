package com.mxraven.examples.springboot.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** GET / lists every example, like the Express app's JSON index. */
@RestController
public class IndexController {

    @GetMapping("/")
    public Map<String, Object> index() {
        List<Map<String, String>> examples = List.of(
                entry("POST", "/api/send-email", "Plain text plus an HTML alternative."),
                entry("POST", "/api/send-template", "Rendered from a plain template."),
                entry("POST", "/api/send-attachments", "File attachment and inline cid: image."),
                entry("POST", "/api/send-delivery-by", "DELIVERBY and DSN envelope parameters."),
                entry("POST", "/api/send-raw", "Pre-serialized RFC 5322 bytes with per-recipient DSNs."),
                entry("POST", "/api/feedback/learn", "Train the spam filter with the exact raw bytes (base64)."),
                entry("POST", "/api/feedback/unsubscribe", "RFC 8058 one-click unsubscribe."),
                entry("POST", "/api/parse-inbound", "Parse MIME into headers, bodies, and attachments."),
                entry("POST", "/api/signup/request-otp", "Email a one-time signup code (only its hash is stored)."),
                entry("POST", "/api/signup/verify-otp", "Verify the code with a constant-time comparison."),
                entry("POST", "/api/webhook", "Signature verification and typed event dispatch."),
                entry("GET", "/api/webhook/events", "Recent webhook events, newest first."));

        return Map.of("name", "mxRaven Spring Boot examples", "examples", examples);
    }

    private static Map<String, String> entry(String method, String path, String description) {
        return Map.of("method", method, "path", path, "description", description);
    }
}
