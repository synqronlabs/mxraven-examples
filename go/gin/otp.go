package main

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"math/big"
	"net/http"
	"sync"
	"time"
)

const (
	otpTTL          = 10 * time.Minute
	otpMaxAttempts  = 5
	otpCodeDigits   = 1000000
	otpExpiresInSec = 600
)

type otpEntry struct {
	hash      string
	expiresAt time.Time
	attempts  int
}

// otpStore keeps pending signup verification codes in memory. Each entry is
// keyed by email and consumed on successful verification.
type otpStore struct {
	mu      sync.Mutex
	entries map[string]*otpEntry
}

func newOTPStore() *otpStore {
	return &otpStore{entries: make(map[string]*otpEntry)}
}

// Issue generates a 6-digit code for email, stores its hash with a 10 minute
// TTL, and returns the plaintext code to the caller.
func (s *otpStore) Issue(email string) (string, error) {
	code, err := randomOTP()
	if err != nil {
		return "", err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.entries[email] = &otpEntry{
		hash:      hashOTP(email, code),
		expiresAt: time.Now().Add(otpTTL),
	}
	return code, nil
}

// Verify checks code for email using a constant-time comparison. It returns
// whether the code matched together with an HTTP status and message to report
// on failure. A successful verification consumes the entry.
func (s *otpStore) Verify(email, code string) (bool, int, string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entry, ok := s.entries[email]
	if !ok {
		return false, http.StatusNotFound, "no verification code was requested for this email"
	}
	if time.Now().After(entry.expiresAt) {
		delete(s.entries, email)
		return false, http.StatusGone, "verification code has expired"
	}

	entry.attempts++
	if entry.attempts > otpMaxAttempts {
		delete(s.entries, email)
		return false, http.StatusTooManyRequests, "too many verification attempts, request a new code"
	}

	presented := hashOTP(email, code)
	if subtle.ConstantTimeCompare([]byte(entry.hash), []byte(presented)) != 1 {
		if entry.attempts >= otpMaxAttempts {
			delete(s.entries, email)
			return false, http.StatusTooManyRequests, "too many verification attempts, request a new code"
		}
		return false, http.StatusUnauthorized, "invalid verification code"
	}

	delete(s.entries, email)
	return true, http.StatusOK, ""
}

func randomOTP() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(otpCodeDigits))
	if err != nil {
		return "", fmt.Errorf("generate verification code: %w", err)
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func hashOTP(email, code string) string {
	sum := sha256.Sum256([]byte(email + ":" + code))
	return hex.EncodeToString(sum[:])
}
