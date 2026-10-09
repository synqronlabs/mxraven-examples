import { Client, Message, SMTPError } from "@mxraven/mail";

/**
 * A 1x1 placeholder PNG. Replace it with your own image bytes; the SDK does
 * not fetch remote URLs, so attachments must be supplied as `Uint8Array`.
 */
const logoPng = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (character) => character.charCodeAt(0),
);

interface SendAttachmentsBody {
  to?: string;
  file?: {
    filename?: string;
    contentType?: string;
    dataBase64?: string;
  };
}

/**
 * POST /api/send-attachments
 *
 * Sends a `multipart/mixed` message with a regular file attachment and an
 * inline image that the HTML body references with `cid:`. An optional file can
 * be supplied as base64.
 *
 * curl -s localhost:3000/api/send-attachments -H 'Content-Type: application/json' \
 *   -d '{"to":"you@example.com"}'
 */
export default defineEventHandler(async (event) => {
  let body: SendAttachmentsBody;
  try {
    body = ((await readBody(event)) ?? {}) as SendAttachmentsBody;
  } catch {
    setResponseStatus(event, 400);
    return { error: "Request body must be JSON." };
  }

  const { to } = body;
  if (typeof to !== "string" || to.trim() === "") {
    setResponseStatus(event, 400);
    return { error: "`to` is required." };
  }

  const host = process.env.MXRAVEN_HOST;
  const username = process.env.MXRAVEN_USERNAME;
  const secret = process.env.MXRAVEN_SECRET;
  if (host === undefined || username === undefined || secret === undefined) {
    setResponseStatus(event, 500);
    return { error: "Set MXRAVEN_HOST, MXRAVEN_USERNAME, and MXRAVEN_SECRET in .env." };
  }

  const client = new Client({
    host,
    port: Number(process.env.MXRAVEN_PORT ?? 587),
    username,
    secret,
  });

  const report = new TextEncoder().encode("id,name\n1,Ada Lovelace\n2,Alan Turing\n");

  const message = new Message()
    .from(process.env.MXRAVEN_MAIL_FROM ?? "noreply@your-domain.example")
    .to(to)
    .subject("Your report")
    .text("Your report is attached.")
    .html('<p>Your report is attached.</p><p><img src="cid:logo" alt="Acme logo" /></p>')
    // A full attachment with an explicit content type.
    .attach({ filename: "report.csv", contentType: "text/csv", data: report })
    // An inline attachment referenced as `cid:logo` from the HTML body.
    .attachInline("logo.png", "logo", logoPng);

  // Optionally attach a file uploaded from the demo page.
  const upload = body.file;
  if (upload !== undefined && typeof upload.dataBase64 === "string" && upload.dataBase64 !== "") {
    try {
      message.attach({
        filename: upload.filename ?? "upload.bin",
        contentType: upload.contentType ?? "application/octet-stream",
        data: Uint8Array.from(atob(upload.dataBase64), (character) => character.charCodeAt(0)),
      });
    } catch {
      setResponseStatus(event, 400);
      return { error: "`file.dataBase64` is not valid base64." };
    }
  }

  try {
    const result = await client.send(message);
    return {
      messageRef: result.messageRef,
      code: result.code,
      attachments: upload === undefined ? 2 : 3,
    };
  } catch (error) {
    if (error instanceof SMTPError) {
      setResponseStatus(event, error.permanent ? 502 : 503);
      return { error: error.message, code: error.code, permanent: error.permanent };
    }
    setResponseStatus(event, 500);
    return { error: error instanceof Error ? error.message : "Send failed." };
  } finally {
    await client.close();
  }
});
