package com.mxraven.examples.plain;

/** A plain template renderer: no engine, just string building. */
public record WelcomeTemplate() {

    /** The subject, text, and HTML produced for one name. */
    public record Rendered(String subject, String text, String html) {
    }

    public Rendered render(String name) {
        return new Rendered(
                "Welcome, " + name,
                "Welcome, " + name + "!\n\nSent from a plain template renderer.",
                "<h1>Welcome, " + name + "!</h1><p>Sent from a plain template renderer.</p>");
    }
}
