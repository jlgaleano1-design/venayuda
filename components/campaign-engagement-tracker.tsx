"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n";

type CampaignEngagementEvent = {
  eventType: "campaign_view" | "payment_method_copy";
  locale: Locale;
  path: string;
  paymentMethodId?: string;
  referrer?: string;
  slug: string;
};

export function CampaignEngagementTracker({
  locale,
  slug,
}: {
  locale: Locale;
  slug: string;
}) {
  useEffect(() => {
    const storageKey = `vendonar:campaign-view:${slug}`;

    if (window.sessionStorage.getItem(storageKey)) {
      return;
    }

    window.sessionStorage.setItem(storageKey, "1");
    trackCampaignEngagement({
      eventType: "campaign_view",
      locale,
      path: window.location.pathname,
      referrer: document.referrer,
      slug,
    });
  }, [locale, slug]);

  return null;
}

export function trackCampaignEngagement(event: CampaignEngagementEvent) {
  const body = JSON.stringify(event);

  if (navigator.sendBeacon) {
    const payload = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/campaign-engagement", payload);
    return;
  }

  void fetch("/api/campaign-engagement", {
    body,
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    method: "POST",
  });
}
