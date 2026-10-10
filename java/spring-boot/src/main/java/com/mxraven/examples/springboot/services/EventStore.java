package com.mxraven.examples.springboot.services;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.UUID;

/** Keeps the most recent webhook events for GET /api/webhook/events. */
@Service
public class EventStore {

    private static final int MAX_EVENTS = 25;

    public record StoredEvent(String id, String type, String summary, String receivedAt) {
    }

    private final Deque<StoredEvent> events = new ArrayDeque<>();

    public synchronized void record(String type, String summary) {
        events.addFirst(new StoredEvent(UUID.randomUUID().toString(), type, summary, Instant.now().toString()));
        while (events.size() > MAX_EVENTS) {
            events.removeLast();
        }
    }

    public synchronized List<StoredEvent> recent() {
        return List.copyOf(events);
    }
}
