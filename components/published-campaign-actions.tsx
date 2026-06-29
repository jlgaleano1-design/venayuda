"use client";

import { Check, ExternalLink, Share2 } from "lucide-react";
import { useState } from "react";
import { ShareCampaignButton } from "@/components/share-campaign-button";
import type { Locale } from "@/lib/i18n";
import type { ShareCampaignData } from "@/lib/share-campaign";

export function PublishedCampaignActions({
  campaignPath,
  locale = "es",
  publicCampaignUrl,
  shareCampaign,
  variant = "inline",
}: {
  campaignPath: string;
  locale?: Locale;
  publicCampaignUrl: string;
  shareCampaign?: ShareCampaignData;
  variant?: "fixed" | "inline";
}) {
  const [copied, setCopied] = useState(false);

  async function sharePublicLink() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Campaña publicada en Vendonar",
          text: "Ya puedes apoyar esta campaña en Vendonar.",
          url: publicCampaignUrl,
        });
      } else {
        await navigator.clipboard.writeText(publicCampaignUrl);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  const className =
    variant === "fixed"
      ? "fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-neutral-200 bg-[#FFFCF8]/95 px-3 py-2 shadow-[0_-4px_14px_rgb(42_53_52/4%)] backdrop-blur sm:hidden"
      : "hidden gap-3 sm:flex";

  return (
    <div className={className}>
      <ActionButtons
        campaignPath={campaignPath}
        copied={copied}
        locale={locale}
        onShare={sharePublicLink}
        shareCampaign={shareCampaign}
      />
    </div>
  );
}

function ActionButtons({
  campaignPath,
  copied,
  locale,
  onShare,
  shareCampaign,
}: {
  campaignPath: string;
  copied: boolean;
  locale: Locale;
  onShare: () => void;
  shareCampaign?: ShareCampaignData;
}) {
  return (
    <>
      {shareCampaign ? (
        <ShareCampaignButton
          campaign={shareCampaign}
          className="min-w-0 flex-1 px-3 sm:w-auto sm:flex-none sm:px-5"
          locale={locale}
        />
      ) : (
        <button
          className="btn-primary min-w-0 flex-1 px-3 sm:w-auto sm:flex-none sm:px-5"
          type="button"
          onClick={onShare}
        >
          {copied ? <Check size={18} /> : <Share2 size={18} />}
          {copied ? "Link copiado" : "Compartir"}
        </button>
      )}
      <a className="btn-secondary min-w-0 flex-1 px-3 sm:w-auto sm:flex-none sm:px-5" href={campaignPath}>
        <ExternalLink size={18} />
        Ver campaña
      </a>
    </>
  );
}
