package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
)

var (
	envOnce sync.Once
	envVars map[string]string
)

// loadEnv reads the nearest .env file found in the working directory or in up
// to three parent directories. Values loaded from the file are used as a
// fallback when the process environment does not define the key.
func loadEnv() {
	envOnce.Do(func() {
		envVars = make(map[string]string)
		dir, err := os.Getwd()
		if err != nil {
			return
		}
		for depth := 0; depth <= 3; depth++ {
			data, err := os.ReadFile(filepath.Join(dir, ".env"))
			if err == nil {
				parseEnvFile(string(data))
				return
			}
			parent := filepath.Dir(dir)
			if parent == dir {
				return
			}
			dir = parent
		}
	})
}

// parseEnvFile reads KEY=VALUE lines, ignores blank lines and comments, and
// strips surrounding quotes from values.
func parseEnvFile(content string) {
	scanner := bufio.NewScanner(strings.NewReader(content))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		value = strings.TrimSpace(value)
		if len(value) >= 2 {
			if (value[0] == '"' && value[len(value)-1] == '"') || (value[0] == '\'' && value[len(value)-1] == '\'') {
				value = value[1 : len(value)-1]
			}
		}
		envVars[key] = value
	}
}

// Get returns key from the .env file first, falling back to os.Getenv. An
// empty string means the key is unset.
func Get(key string) string {
	loadEnv()
	if value, ok := envVars[key]; ok && value != "" {
		return value
	}
	return os.Getenv(key)
}

// Require is Get with an error when the key is unset or empty.
func Require(key string) (string, error) {
	value := Get(key)
	if value == "" {
		return "", fmt.Errorf("missing required environment variable %s", key)
	}
	return value, nil
}

// Port reads key as a TCP port, returning fallback when it is unset or not a
// valid port number.
func Port(key string, fallback int) int {
	value := Get(key)
	if value == "" {
		return fallback
	}
	port, err := strconv.Atoi(value)
	if err != nil || port <= 0 || port > 65535 {
		return fallback
	}
	return port
}
