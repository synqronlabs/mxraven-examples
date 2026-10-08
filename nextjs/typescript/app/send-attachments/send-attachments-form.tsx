"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  Field,
  FieldGroup,
  ResultPanel,
  buttonClass,
  inputClass,
  useExampleRequest,
} from "@/components/runner";

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function SendAttachmentsForm() {
  const { state, run } = useExampleRequest();
  const [to, setTo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function clearFile() {
    setFile(null);
    if (fileInput.current !== null) {
      fileInput.current.value = "";
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const upload =
      file === null
        ? undefined
        : {
            filename: file.name,
            contentType: file.type === "" ? undefined : file.type,
            dataBase64: await fileToBase64(file),
          };

    void run(() =>
      fetch("/api/send-attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, file: upload }),
      }),
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="To">
        <input
          type="email"
          required
          value={to}
          onChange={(event) => setTo(event.target.value)}
          placeholder="you@example.com"
          className={inputClass}
        />
      </Field>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Every message includes a generated <code>report.csv</code> and an inline <code>logo.png</code> reference.
      </p>
      <FieldGroup label="Your own file" hint="optional">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInput}
            id="attachment-file"
            type="file"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <label
            htmlFor="attachment-file"
            className="cursor-pointer rounded-md border border-black/10 px-3 py-2 text-sm font-medium outline-none transition-colors hover:border-black/30 focus-within:border-black/30 dark:border-white/15 dark:hover:border-white/40 dark:focus-within:border-white/40"
          >
            Choose file
          </label>
          <span className="text-sm font-normal text-zinc-500">
            {file === null ? "No file chosen" : file.name}
          </span>
          {file !== null && (
            <button
              type="button"
              onClick={clearFile}
              className="text-sm font-normal text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
            >
              Remove
            </button>
          )}
        </div>
      </FieldGroup>
      <button type="submit" disabled={state.status === "running"} className={buttonClass}>
        Send with attachments
      </button>
      <ResultPanel state={state} />
    </form>
  );
}
