package com.mxraven.examples.springboot.templates;

/**
 * A plain template. The Java SDK does not ship a template engine, so a
 * template is just a method that produces the subject and bodies.
 */
public final class WelcomeTemplate {

    private WelcomeTemplate() {
    }

    public record Rendered(String subject, String text, String html) {
    }

    public static Rendered render(String name) {
        String subject = "Welcome, " + name;
        String text = "Welcome, " + name + "!\n\nSent from a plain template in Spring Boot.";
        String html = "<h1>Welcome, " + name + "!</h1>"
                + "<p>Sent from a plain template in Spring Boot.</p>";
        return new Rendered(subject, text, html);
    }
}
