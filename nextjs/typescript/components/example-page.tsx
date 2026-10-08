import Link from "next/link";
import type { ReactNode } from "react";
import { CodeBlock } from "@/components/code-block";

export interface Snippet {
  title?: string;
  label?: string;
  code: string;
}

interface ExamplePageProps {
  title: string;
  description: string;
  snippets: Snippet[];
  children: ReactNode;
}

/** Shared shell for every example page: title, description, snippets, demo. */
export function ExamplePage({ title, description, snippets, children }: ExamplePageProps) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 rounded-md border border-black/10 px-2.5 py-1.5 text-sm font-medium text-zinc-600 outline-none transition-colors hover:border-black/30 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-black/25 dark:border-white/15 dark:text-zinc-400 dark:hover:border-white/40 dark:hover:text-zinc-100 dark:focus-visible:ring-white/30"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path d="M10 3.5 5.5 8 10 12.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All examples
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{description}</p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Try it</h2>
        {children}
      </section>

      {snippets.map((snippet, index) => (
        <section key={index} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            {snippet.title ?? "Code"}
          </h2>
          <CodeBlock code={snippet.code} label={snippet.label} />
        </section>
      ))}
    </main>
  );
}
