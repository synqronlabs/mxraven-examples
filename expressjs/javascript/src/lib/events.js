const maxEvents = 25;

// Anchored on globalThis so the store survives module reloads.
const globalStore = globalThis;
const eventLog = (globalStore.__mxravenEvents ??= []);

/** Records a received webhook event for the events endpoint. */
export function recordEvent(type, summary) {
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
export function listRecentEvents() {
  return eventLog;
}
