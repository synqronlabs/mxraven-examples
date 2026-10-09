import type { APIRoute } from "astro";
import { listRecentEvents } from "../../../lib/events";

/**
 * GET /api/webhook/events
 *
 * Returns the recent webhook events recorded by the listeners, newest first.
 */
export const GET: APIRoute = () => {
  return Response.json(listRecentEvents());
};
