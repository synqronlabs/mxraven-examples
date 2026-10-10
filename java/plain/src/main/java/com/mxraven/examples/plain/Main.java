package com.mxraven.examples.plain;

import com.mxraven.examples.plain.examples.AllExample;
import com.mxraven.examples.plain.examples.FeedbackExample;
import com.mxraven.examples.plain.examples.ParseInboundExample;
import com.mxraven.examples.plain.examples.SendAttachmentsExample;
import com.mxraven.examples.plain.examples.SendDeliveryByExample;
import com.mxraven.examples.plain.examples.SendEmailExample;
import com.mxraven.examples.plain.examples.SendRawExample;
import com.mxraven.examples.plain.examples.SendTemplateExample;
import com.mxraven.examples.plain.examples.WebhookExample;

import java.util.Arrays;

/** Dispatches the first CLI argument to one example class. */
public final class Main {

    private Main() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            usage();
            System.exit(1);
        }
        String command = args[0];
        String[] rest = Arrays.copyOfRange(args, 1, args.length);
        switch (command) {
            case "send-email" -> SendEmailExample.main(rest);
            case "send-template" -> SendTemplateExample.main(rest);
            case "send-attachments" -> SendAttachmentsExample.main(rest);
            case "send-delivery-by" -> SendDeliveryByExample.main(rest);
            case "send-raw" -> SendRawExample.main(rest);
            case "feedback" -> FeedbackExample.main(rest);
            case "parse" -> ParseInboundExample.main(rest);
            case "webhook" -> WebhookExample.main(rest);
            case "all" -> AllExample.main(rest);
            default -> {
                System.err.println("Unknown command: " + command);
                System.err.println();
                usage();
                System.exit(1);
            }
        }
    }

    private static void usage() {
        System.out.println("""
                Usage: ./gradlew :plain:run --args="<command> [args]"

                Commands:
                  send-email <to>                                  text + HTML message
                  send-template <to> [name]                        rendered from a plain template
                  send-attachments <to>                            CSV attachment + inline cid image
                  send-delivery-by <to> [seconds] [envid]          DELIVERBY and DSN envelope params
                  send-raw <to>                                    prebuilt RFC 5322 bytes with per-recipient DSN
                  feedback spam <file.eml>                         teach mxRaven the message is spam
                  feedback ham <file.eml>                          teach mxRaven the message is not spam
                  feedback unsubscribe <token>                     RFC 8058 one-click unsubscribe
                  parse [file.eml]                                 parse a raw MIME message
                  webhook                                          start the webhook listener
                  all <to>                                         run every send example in sequence

                Run from the java/ directory. Copy .env.example to .env first.""");
    }
}
