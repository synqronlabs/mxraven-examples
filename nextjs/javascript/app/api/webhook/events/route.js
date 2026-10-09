import { connection } from "next/server";
import { listRecentEvents } from "@/lib/events";

/**
 * GET /api/webhook/events
 *
 * Returns the recent webhook events recorded by the listeners, newest first.
 * `connection()` keeps the route dynamic so the in-memory log is read at
 * request time rather than prerendered at build time.
 */
export async function GET() {
  await connection();
  return Response.json(listRecentEvents());
}
