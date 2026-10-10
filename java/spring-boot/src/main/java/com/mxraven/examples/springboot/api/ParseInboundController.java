package com.mxraven.examples.springboot.api;

import com.mxraven.mail.mime.Attachment;
import com.mxraven.mail.mime.ParsedEmail;
import com.mxraven.mail.model.MailboxAddress;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** POST /api/parse-inbound: parse raw MIME bytes into headers and parts. */
@RestController
public class ParseInboundController {

    @PostMapping("/api/parse-inbound")
    public Map<String, Object> parse(HttpServletRequest request) throws IOException {
        // Read the stream directly so any Content-Type is accepted.
        byte[] body = request.getInputStream().readAllBytes();
        if (body.length == 0) {
            throw new IllegalArgumentException("POST the raw RFC 5322 message as the request body.");
        }

        ParsedEmail parsed = ParsedEmail.parse(body);

        List<Map<String, Object>> attachments = parsed.attachments().stream()
                .map(ParseInboundController::attachmentSummary)
                .toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("subject", parsed.subject());
        response.put("from", addresses(parsed.from()));
        response.put("to", addresses(parsed.to()));
        response.put("cc", addresses(parsed.cc()));
        response.put("messageId", parsed.messageId().orElse(null));
        response.put("date", parsed.date().map(Object::toString).orElse(null));
        response.put("text", parsed.textBody().orElse(null));
        response.put("html", parsed.htmlBody().orElse(null));
        response.put("attachments", attachments);
        return response;
    }

    private static List<String> addresses(List<MailboxAddress> addresses) {
        return addresses.stream().map(MailboxAddress::toString).toList();
    }

    private static Map<String, Object> attachmentSummary(Attachment attachment) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("filename", attachment.filename());
        summary.put("contentType", attachment.contentType());
        summary.put("inline", attachment.inline());
        summary.put("size", attachment.size());
        return summary;
    }
}
