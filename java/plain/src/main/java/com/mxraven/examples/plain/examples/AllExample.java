package com.mxraven.examples.plain.examples;

import java.util.List;

/** Runs every send example in sequence against one recipient. */
public final class AllExample {

    private interface Step {
        String run() throws Exception;
    }

    private record NamedStep(String name, Step step) {
    }

    private AllExample() {
    }

    public static void main(String[] args) {
        if (args.length < 1) {
            System.err.println("Usage: all <to>");
            System.exit(1);
        }
        run(args[0]);
    }

    public static void run(String to) {
        List<NamedStep> steps = List.of(
                new NamedStep("send-email", () -> SendEmailExample.run(to)),
                new NamedStep("send-template", () -> SendTemplateExample.run(to, "Ada")),
                new NamedStep("send-attachments", () -> SendAttachmentsExample.run(to)),
                new NamedStep("send-delivery-by",
                        () -> SendDeliveryByExample.run(to, 3600, "java-" + System.currentTimeMillis())),
                new NamedStep("send-raw", () -> SendRawExample.run(to)));

        int failed = 0;
        for (NamedStep step : steps) {
            System.out.println("\n== " + step.name() + " ==");
            try {
                step.step().run();
            } catch (Exception e) {
                failed++;
                System.err.println(step.name() + " failed: " + e.getMessage());
            }
        }

        System.out.println("\n" + (steps.size() - failed) + "/" + steps.size() + " examples sent.");
        System.out.println("More: parse, feedback, and webhook are separate commands.");
        if (failed > 0) {
            System.exit(1);
        }
    }
}
