package com.mxraven.examples.plain;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

/**
 * Minimal .env loader: looks for `.env` in the current directory and up to
 * three parent directories, parses KEY=VALUE lines, and falls back to the
 * process environment.
 */
public final class Env {

    private static final Map<String, String> FILE_VALUES = load();

    private Env() {
    }

    /** Returns the .env value, then the process environment, or null. */
    public static String get(String name) {
        String fromFile = FILE_VALUES.get(name);
        return fromFile != null ? fromFile : System.getenv(name);
    }

    /** Returns a required value, or throws with a copy-the-example hint. */
    public static String require(String name) {
        String value = get(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(
                    "missing " + name + "; copy .env.example to .env and fill it in");
        }
        return value;
    }

    /** Returns a port from the environment, or the fallback when unset. */
    public static int port(String name, int fallback) {
        String value = get(name);
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private static Map<String, String> load() {
        Path directory = Path.of("").toAbsolutePath();
        for (int depth = 0; depth <= 3 && directory != null; depth++) {
            Path candidate = directory.resolve(".env");
            if (Files.isRegularFile(candidate)) {
                return parse(candidate);
            }
            directory = directory.getParent();
        }
        return Map.of();
    }

    private static Map<String, String> parse(Path file) {
        Map<String, String> values = new HashMap<>();
        try {
            for (String line : Files.readAllLines(file, StandardCharsets.UTF_8)) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }
                int equals = trimmed.indexOf('=');
                if (equals <= 0) {
                    continue;
                }
                values.put(trimmed.substring(0, equals).trim(), trimmed.substring(equals + 1).trim());
            }
        } catch (IOException e) {
            // Unreadable file: keep the process environment as the fallback.
        }
        return Map.copyOf(values);
    }
}
