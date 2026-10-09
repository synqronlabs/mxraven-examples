"use client";

import { useState } from "react";

export function CopyButton({ code }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="rounded-md border border-white/10 px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-white/25 hover:text-zinc-100"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
