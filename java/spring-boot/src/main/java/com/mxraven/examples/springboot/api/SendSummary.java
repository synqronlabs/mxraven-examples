package com.mxraven.examples.springboot.api;

import com.mxraven.mail.SendResult;

/** The fields every send endpoint returns. */
public record SendSummary(String messageRef, boolean success, String message) {

    public static SendSummary of(SendResult result) {
        return new SendSummary(result.messageRef(), result.success(), result.message());
    }
}
