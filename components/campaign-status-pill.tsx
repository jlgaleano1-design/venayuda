import { CheckCircle2 } from "lucide-react";
import type { Campaign } from "@/lib/demo-data";
import { getDictionary, type Locale } from "@/lib/i18n";

export function CampaignStatusPill({
  campaign,
  locale = "es",
}: {
  campaign: Pick<Campaign, "status" | "verifiedByVendonar">;
  locale?: Locale;
}) {
  const t = getDictionary(locale);

  if (campaign.verifiedByVendonar) {
    return (
      <span className="status-pill gap-1.5 bg-emerald-50 text-emerald-800">
        <CheckCircle2 aria-hidden="true" size={14} />
        {t.campaignDetail.verifiedStatus}
      </span>
    );
  }

  return (
    <span className="status-pill bg-neutral-100 text-neutral-600">
      {t.campaignDetail.status[campaign.status]}
    </span>
  );
}
