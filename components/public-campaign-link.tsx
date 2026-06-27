"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function PublicCampaignLink({
  displayUrl,
  publicCampaignUrl,
}: {
  displayUrl: string;
  publicCampaignUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyPublicLink() {
    await navigator.clipboard.writeText(publicCampaignUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-[1.25rem] border border-[#2D5D5E]/20 bg-[#F3FBF8] p-3">
      <p className="text-xs font-extrabold text-[#2D5D5E]">
        Link público de la campaña
      </p>
      <div className="mt-2 flex items-center gap-2">
        <button
          aria-label={copied ? "Link copiado" : "Copiar link público"}
          className="inline-flex size-7 shrink-0 items-center justify-center text-[#2D5D5E] transition hover:opacity-80"
          type="button"
          onClick={copyPublicLink}
        >
          {copied ? <Check size={17} /> : <Copy size={17} />}
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-extrabold leading-5 text-[#2A3534]">
          {displayUrl}
        </p>
      </div>
    </div>
  );
}
