"use client";

import { Upload } from "lucide-react";

export function FileField({
  accept,
  label,
  name,
  required = false,
  selectLabel = "Seleccionar archivo",
  statusMessage,
  onChange,
}: {
  accept: string;
  label: string;
  name: string;
  required?: boolean;
  selectLabel?: string;
  statusMessage?: string;
  onChange: (file: File | null) => void;
}) {
  const hasError = statusMessage?.includes("no permitido");

  return (
    <label className="field-label">
      {label}
      <span className="flex min-h-14 cursor-pointer items-center gap-3 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm transition hover:border-[#2D5D5E]">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#2D5D5E] text-[#FAE880]">
          <Upload size={17} />
        </span>
        <span className="min-w-0 truncate font-bold text-[#2A3534]">
          {statusMessage && !hasError ? statusMessage : selectLabel}
        </span>
      </span>
      <input
        accept={accept}
        className="sr-only"
        name={name}
        required={required}
        type="file"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      {hasError ? (
        <span className="text-xs font-bold text-red-700">{statusMessage}</span>
      ) : null}
    </label>
  );
}
