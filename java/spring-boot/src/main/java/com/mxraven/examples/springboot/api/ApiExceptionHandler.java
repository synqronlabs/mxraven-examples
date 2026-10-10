package com.mxraven.examples.springboot.api;

import com.mxraven.mail.SmtpException;
import com.mxraven.mail.feedback.FeedbackException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.io.IOException;
import java.util.Map;

/** Maps SDK and validation failures to JSON responses. */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(SmtpException.class)
    public ResponseEntity<Map<String, Object>> smtp(SmtpException exception) {
        // 5xx SMTP replies are permanent; 4xx may succeed on retry.
        return ResponseEntity.status(502).body(Map.of("error", String.valueOf(exception.getMessage())));
    }

    @ExceptionHandler(FeedbackException.class)
    public ResponseEntity<Map<String, Object>> feedback(FeedbackException exception) {
        return ResponseEntity.status(exception.statusCode())
                .body(Map.of("error", String.valueOf(exception.detail()), "retryable", exception.retryable()));
    }

    @ExceptionHandler(IOException.class)
    public ResponseEntity<Map<String, Object>> io(IOException exception) {
        // Connection failures land here, for example a refused SMTP connection.
        return ResponseEntity.status(502).body(Map.of("error", String.valueOf(exception.getMessage())));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> badRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of("error", String.valueOf(exception.getMessage())));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> state(IllegalStateException exception) {
        return ResponseEntity.status(500).body(Map.of("error", String.valueOf(exception.getMessage())));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> generic(Exception exception) {
        String message = exception.getMessage() == null ? "Request failed." : exception.getMessage();
        return ResponseEntity.status(500).body(Map.of("error", message));
    }
}
