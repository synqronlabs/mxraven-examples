import express from "express";
import { sendEmailRouter } from "./routes/send-email.ts";
import { sendTemplateRouter } from "./routes/send-template.ts";
import { sendAttachmentsRouter } from "./routes/send-attachments.ts";
import { sendDeliveryByRouter } from "./routes/send-delivery-by.ts";
import { sendRawRouter } from "./routes/send-raw.ts";
import { feedbackRouter } from "./routes/feedback.ts";
import { parseInboundRouter } from "./routes/parse-inbound.ts";
import { signupRouter } from "./routes/signup.ts";
import { webhookRouter } from "./routes/webhook.ts";

const app = express();

// Behind a tunnel or proxy, use the forwarded protocol and host so webhook
// signatures cover the public URL the sender called.
app.set("trust proxy", true);

// Raw bodies first: webhook signatures and MIME parsing need the exact bytes.
app.use("/api/webhook", express.raw({ type: "*/*", limit: "2mb" }));
app.use("/api/parse-inbound", express.raw({ type: "*/*", limit: "2mb" }));
app.use(express.json({ limit: "10mb" }));

/** Index of the available examples. */
app.get("/", (_req, res) => {
  res.json({
    name: "mxRaven Express examples",
    examples: [
      {
        method: "POST",
        path: "/api/send-email",
        description: "Plain text plus an HTML alternative.",
      },
      {
        method: "POST",
        path: "/api/send-template",
        description: "Rendered from a plain template renderer.",
      },
      {
        method: "POST",
        path: "/api/send-attachments",
        description: "File attachment and inline cid: image.",
      },
      {
        method: "POST",
        path: "/api/send-delivery-by",
        description: "DELIVERBY, DSN, and extra MAIL FROM parameters.",
      },
      {
        method: "POST",
        path: "/api/send-raw",
        description: "Pre-serialized RFC 5322 bytes with per-recipient DSNs.",
      },
      {
        method: "POST",
        path: "/api/feedback/learn",
        description: "Train the spam filter with the exact raw bytes (base64).",
      },
      {
        method: "POST",
        path: "/api/feedback/unsubscribe",
        description: "RFC 8058 one-click unsubscribe.",
      },
      {
        method: "POST",
        path: "/api/parse-inbound",
        description: "Parse MIME into headers, bodies, and attachments.",
      },
      {
        method: "POST",
        path: "/api/signup/request-otp",
        description: "Email a one-time signup code (only its hash is stored).",
      },
      {
        method: "POST",
        path: "/api/signup/verify-otp",
        description: "Verify the code with a constant-time comparison.",
      },
      {
        method: "POST",
        path: "/api/webhook",
        description: "Signature verification and typed event dispatch.",
      },
      {
        method: "GET",
        path: "/api/webhook/events",
        description: "Recent webhook events, newest first.",
      },
    ],
  });
});

app.use("/api/send-email", sendEmailRouter);
app.use("/api/send-template", sendTemplateRouter);
app.use("/api/send-attachments", sendAttachmentsRouter);
app.use("/api/send-delivery-by", sendDeliveryByRouter);
app.use("/api/send-raw", sendRawRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/parse-inbound", parseInboundRouter);
app.use("/api/signup", signupRouter);
app.use("/api/webhook", webhookRouter);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`mxRaven Express examples on http://localhost:${port}`);
});
