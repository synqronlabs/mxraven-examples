package main

import (
	"fmt"
)

// runAll runs the five send examples in order against the same recipient,
// catching each step's error so the remaining steps still run.
func runAll(args []string) error {
	if len(args) != 1 {
		return usageError("usage: go run . all <to>")
	}
	to := args[0]
	steps := []struct {
		name string
		run  func([]string) error
	}{
		{"send-email", runSendEmail},
		{"send-template", runSendTemplate},
		{"send-attachments", runSendAttachments},
		{"send-delivery-by", runSendDeliveryBy},
		{"send-raw", runSendRaw},
	}

	sent := 0
	for _, step := range steps {
		fmt.Printf("== %s ==\n", step.name)
		if err := step.run([]string{to}); err != nil {
			fmt.Printf("  failed: %v\n", err)
			continue
		}
		sent++
	}
	fmt.Printf("%d/%d examples sent.\n", sent, len(steps))
	fmt.Println("More: go run . feedback, go run . webhook")
	return nil
}
