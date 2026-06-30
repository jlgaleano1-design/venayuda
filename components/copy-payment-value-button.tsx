"use client";

import { trackCampaignEngagement } from "@/components/campaign-engagement-tracker";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";

export function CopyPaymentValueButton({
  locale = "es",
  paymentMethodId,
  slug,
  value,
}: {
  locale?: Locale;
  paymentMethodId?: string;
  slug?: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    if (slug && paymentMethodId) {
      trackCampaignEngagement({
        eventType: "payment_method_copy",
        locale,
        path: window.location.pathname,
        paymentMethodId,
        referrer: document.referrer,
        slug,
      });
    }
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
