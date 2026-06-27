"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyPaymentValueButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      aria-label={copied ? "ID copiado" : "Copiar ID"}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[#2D5D5E] transition hover:bg-[#2D5D5E]/10"
      type="button"
      onClick={copyValue}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}
