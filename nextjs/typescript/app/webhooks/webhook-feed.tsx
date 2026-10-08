"use client";

import { useEffect, useState } from "react";
import type { StoredEvent } from "@/lib/events";

async function fetchEvents(): Promise<StoredEvent[]> {
  const response = await fetch("/api/webhook/events", { cache: "no-store" });
  return response.ok ? ((await response.json()) as StoredEvent[]) : [];
}

/** Live feed of events recorded by the webhook listener. */
export function WebhookFeed() {
  const [events, setEvents] = useState<StoredEvent[]>([]);

  useEffect(() => {
    let active = true;
    const load = () => {
      void fetchEvents().then((payload) => {
        if (active) {
          setEvents(payload);
        }
      });
    };

    load();
    const timer = setInterval(load, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-black/10 p-5 text-sm dark:border-white/15">
        <p className="font-medium">Point real traffic at this listener</p>
        <ol className="mt-3 flex list-decimal flex-col gap-1.5 pl-5 text-zinc-600 dark:text-zinc-400">
          <li>
            Run the app with <code>bun dev</code>.
          </li>
          <li>
            Expose it with a tunnel, for example <code>ngrok http 3000</code>.
          </li>
          <li>
            In mxRaven, create a webhook endpoint pointing at{" "}
            <code>https://&lt;tunnel&gt;/api/webhook</code>.
          </li>
          <li>
            Copy its signing secret into <code>MXRAVEN_WEBHOOK_SECRET</code> in <code>.env</code> and
            restart.
          </li>
        </ol>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          Deliveries appear below within a few seconds.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            Live events
            <span className="inline-flex items-center gap-1.5 text-xs font-normal text-zinc-500">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
              listening
            </span>
          </span>
          <button
            type="button"
            onClick={() => void fetchEvents().then(setEvents)}
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Refresh
          </button>
        </div>

        {events.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Waiting for deliveries. Events recorded by the listener show up here.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/15">
            {events.map((event) => (
              <li key={event.id} className="flex flex-col gap-1 p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-xs font-semibold dark:bg-white/[.08]">
                    {event.type}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(event.receivedAt).toLocaleTimeString()}
                  </span>
                </div>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{event.summary}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
