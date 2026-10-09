/** A webhook event kept for the demo page. */
import type { StoredEvent } from "#shared/events";

export type { StoredEvent };

const maxEvents = 25;

// Anchored on globalThis so the store is shared across route bundles and survives HMR.
const globalStore = globalThis as typeof globalThis & { __mxravenEvents?: StoredEvent[] };
const eventLog = (globalStore.__mxravenEvents ??= []);

/** Records a received webhook event for display in the webhook example page. */
export function recordEvent(type: string, summary: string): void {
  eventLog.unshift({
    id: crypto.randomUUID(),
    type,
    summary,
    receivedAt: new Date().toISOString(),
  });
  if (eventLog.length > maxEvents) {
    eventLog.length = maxEvents;
  }
}

/** Returns the most recent events, newest first. */
export function listRecentEvents(): readonly StoredEvent[] {
  return eventLog;
}
