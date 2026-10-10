package main

import (
	"sync"
	"time"
)

const maxRecordedEvents = 25

// Event is one decoded webhook delivery recorded in the in-memory log.
type Event struct {
	ID         int64  `json:"id"`
	Type       string `json:"type"`
	Summary    string `json:"summary"`
	ReceivedAt string `json:"receivedAt"`
}

// eventLog is a bounded, concurrency-safe log of recent webhook events. The
// newest event is always first and at most maxRecordedEvents are retained.
type eventLog struct {
	mu     sync.Mutex
	nextID int64
	events []Event
}

func newEventLog() *eventLog {
	return &eventLog{}
}

// Record prepends a new event to the log and trims the oldest entries.
func (l *eventLog) Record(eventType, summary string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.nextID++
	record := Event{
		ID:         l.nextID,
		Type:       eventType,
		Summary:    summary,
		ReceivedAt: time.Now().UTC().Format(time.RFC3339),
	}
	l.events = append([]Event{record}, l.events...)
	if len(l.events) > maxRecordedEvents {
		l.events = l.events[:maxRecordedEvents]
	}
}

// Recent returns a copy of the recorded events, newest first.
func (l *eventLog) Recent() []Event {
	l.mu.Lock()
	defer l.mu.Unlock()

	out := make([]Event, len(l.events))
	copy(out, l.events)
	return out
}
