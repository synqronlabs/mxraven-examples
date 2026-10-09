import { CopyButton } from "@/components/copy-button";

/** Plain code snippet with a source label and a copy button. */
export function CodeBlock({ code, label }) {
  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-zinc-950 dark:border-white/15">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2">
        <span className="truncate font-mono text-xs text-zinc-400">{label ?? "code"}</span>
        <CopyButton code={code} />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-zinc-100">{code}</pre>
    </div>
  );
}
