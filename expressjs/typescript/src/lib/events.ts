export interface StoredEvent {
  id: string;
  type: string;
  summary: string;
  receivedAt: string;
}

const maxEvents = 25;

// Anchored on globalThis so the store survives module reloads.
const globalStore = globalThis as typeof globalThis & { __mxravenEvents?: StoredEvent[] };
const eventLog = (globalStore.__mxravenEvents ??= []);

/** Records a received webhook event for the events endpoint. */
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
