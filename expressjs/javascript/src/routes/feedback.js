import { Router } from "express";
import { Client, FeedbackError, disposition } from "@mxraven/mail/feedback";

export const feedbackRouter = Router();

/**
 * POST /api/feedback/learn
 *
 * Teaches the spam filter with the exact raw message bytes mxRaven processed,
 * supplied as base64. The service matches the bytes against stored evidence by
 * SHA-256, so a message with no matching evidence fails with a 404.
 */
feedbackRouter.post("/learn", async (req, res) => {
  const body = req.body;
  const label = body.label === "ham" ? "ham" : body.label === "spam" ? "spam" : undefined;
  if (label === undefined) {
    res.status(400).json({ error: "`label` must be `spam` or `ham`." });
    return;
  }
  if (typeof body.rawMimeBase64 !== "string" || body.rawMimeBase64 === "") {
    res.status(400).json({ error: "`rawMimeBase64` is required." });
    return;
  }

  const baseUrl = process.env.MXRAVEN_FEEDBACK_BASE_URL ?? "https://feedback.mxraven.com";
  const username = process.env.MXRAVEN_USERNAME;
  const secret = process.env.MXRAVEN_SECRET;
  if (username === undefined || secret === undefined) {
    res.status(500).json({ error: "Set MXRAVEN_USERNAME and MXRAVEN_SECRET in .env." });
    return;
  }

  let rawMime;
  try {
    rawMime = Uint8Array.from(atob(body.rawMimeBase64), (character) => character.charCodeAt(0));
  } catch {
    res.status(400).json({ error: "`rawMimeBase64` is not valid base64." });
    return;
  }

  const client = new Client({ baseUrl, username, secret });

  try {
    const result = await client.learn(
      label === "spam" ? disposition.spam : disposition.ham,
      rawMime,
    );
    res.json({
      status: result.status,
      disposition: result.disposition,
      tenantId: result.tenantId,
      listenerId: result.listenerId,
      matchedHashKind: result.matchedHashKind,
    });
  } catch (error) {
    if (error instanceof FeedbackError) {
      res.status(error.statusCode).json({ error: error.detail, retryable: error.retryable });
      return;
    }
    res.status(500).json({ error: error instanceof Error ? error.message : "Learning failed." });
  }
});

/**
 * POST /api/feedback/unsubscribe
 *
 * Performs an RFC 8058 one-click unsubscribe for a signed token. This is the
 * operation a recipient mail client performs against the `List-Unsubscribe`
 * URL; applications rarely call it directly.
 */
feedbackRouter.post("/unsubscribe", async (req, res) => {
  const body = req.body;
  if (typeof body.token !== "string" || body.token === "") {
    res.status(400).json({ error: "`token` is required." });
    return;
  }

  const baseUrl = process.env.MXRAVEN_FEEDBACK_BASE_URL ?? "https://feedback.mxraven.com";
  const client = new Client({ baseUrl });

  try {
    await client.unsubscribe(body.token);
    res.json({ ok: true });
  } catch (error) {
    if (error instanceof FeedbackError) {
      res.status(error.statusCode).json({ error: error.detail, retryable: error.retryable });
      return;
    }
    res.status(500).json({ error: error instanceof Error ? error.message : "Unsubscribe failed." });
  }
});
