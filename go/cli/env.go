package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// dotEnv holds the values parsed from the nearest .env file, if any. The file
// is loaded once at startup, before any command runs.
var dotEnv = loadDotEnv()

// loadDotEnv searches the working directory and up to three parent
// directories for a .env file and returns its parsed values.
func loadDotEnv() map[string]string {
	values := make(map[string]string)
	dir, err := os.Getwd()
	if err != nil {
		return values
	}
	for depth := 0; depth <= 3; depth++ {
		path := filepath.Join(dir, ".env")
		if _, err := os.Stat(path); err == nil {
			parseDotEnv(path, values)
			return values
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return values
}

// parseDotEnv reads KEY=VALUE lines into values. Blank lines and lines
// starting with "#" are skipped, and keys and values are trimmed.
func parseDotEnv(path string, values map[string]string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
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
		values[key] = strings.TrimSpace(value)
	}
}

// Get returns the value of name from the nearest .env file, falling back to
// the process environment when the file does not define it.
func Get(name string) string {
	if value, ok := dotEnv[name]; ok {
		return value
	}
	return os.Getenv(name)
}

// Require returns the value of name or an error when it is unset.
func Require(name string) (string, error) {
	value := Get(name)
	if value == "" {
		return "", fmt.Errorf("missing required environment variable %s (set it in .env or the environment)", name)
	}
	return value, nil
}

// Port returns the port configured in name, or fallback when it is unset or
// not a valid TCP port.
func Port(name string, fallback int) int {
	value := Get(name)
	if value == "" {
		return fallback
	}
	port, err := strconv.Atoi(value)
	if err != nil || port <= 0 || port > 65535 {
		return fallback
	}
	return port
}
