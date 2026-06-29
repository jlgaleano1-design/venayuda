"use client";

import { Send, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { DonationReportForm } from "@/components/donation-report-form";
import type { Campaign } from "@/lib/demo-data";
import { getCampaignText, getDictionary, type Locale } from "@/lib/i18n";

export function DonationReportModal({
  campaign,
  defaultOpen = false,
  locale = "es",
}: {
  campaign: Campaign;
  defaultOpen?: boolean;
  locale?: Locale;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMounted, setIsMounted] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const t = getDictionary(locale).donationReport;
  const campaignText = getCampaignText({
    description: campaign.description,
    descriptionEn: campaign.descriptionEn,
    locale,
    slug: campaign.slug,
    title: campaign.title,
    titleEn: campaign.titleEn,
  });

  useEffect(() => {
    setIsMounted(true);

    const query = new URLSearchParams(window.location.search);

    if (query.get("reportar") === "aporte") {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <>
      <button
        className="btn-primary w-full justify-center"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        {t.button}
        <Send size={16} />
      </button>

      {isOpen && isMounted
        ? createPortal(
            <div
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#121515]/45 px-4 py-6 sm:py-10"
              role="dialog"
            >
              <button
                aria-label={t.closeReport}
                className="absolute inset-0 cursor-default"
                type="button"
                onClick={() => setIsOpen(false)}
              />
              <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[2rem] border border-neutral-200 bg-[#FEFEFE] shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-5 md:p-6">
                  <div className="space-y-2">
                    <span className="soft-pill">{t.button}</span>
                    <h2
                      className="text-2xl font-black leading-tight tracking-normal"
                      id={titleId}
                    >
                      {t.modalTitle(campaignText.title)}
                    </h2>
                    <p
                      className="text-sm leading-6 text-neutral-700"
                      id={descriptionId}
                    >
                      {t.modalDescription}
                    </p>
                  </div>
                  <button
                    aria-label={t.close}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-[#2A3534] shadow-sm hover:border-[#2D5D5E]/30"
                    type="button"
                    onClick={() => setIsOpen(false)}
                  >
                    <X size={18} />
                  </button>
                </div>
                <DonationReportForm
                  campaign={campaign}
                  framed={false}
                  locale={locale}
                />
              </div>
            </div>,
          document.body,
        )
        : null}
    </>
  );
}
