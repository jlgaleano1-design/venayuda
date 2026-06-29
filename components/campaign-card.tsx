import { Card } from "@heroui/react";
import { CheckCircle2, Instagram, MapPin } from "lucide-react";
import Link from "next/link";
import { Campaign } from "@/lib/demo-data";
import {
  getCampaignText,
  getDictionary,
  getReceivingCategoryLabel,
  type Locale,
} from "@/lib/i18n";
import { getPublicCampaignPath } from "@/lib/public-campaign-url";

export function CampaignCard({
  campaign,
  locale = "es",
}: {
  campaign: Campaign;
  locale?: Locale;
}) {
  const t = getDictionary(locale);
  const campaignText = getCampaignText({
    description: campaign.description,
    descriptionEn: campaign.descriptionEn,
    locale,
    slug: campaign.slug,
    title: campaign.title,
    titleEn: campaign.titleEn,
  });

  return (
    <Card className="surface-card shadow-none">
      <Card.Content className="flex flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <span
              className={
                campaign.status === "active"
                  ? "status-pill bg-emerald-50 text-emerald-800"
                  : "status-pill bg-neutral-100 text-neutral-700"
              }
            >
              {t.campaignDetail.status[campaign.status]}
            </span>
            {campaign.verifiedByVendonar ? (
              <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-[#2D5D5E]/10 px-3 py-1 text-xs font-extrabold text-[#2D5D5E]">
                <CheckCircle2 aria-hidden="true" size={14} />
                {t.campaignDetail.vendonarConfirmed}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1 text-xs text-neutral-600">
            <MapPin size={14} />
            {campaign.affectedArea}
          </div>
        </div>
        <div className="flex items-start justify-between gap-4">
          <h3 className="min-w-0 text-xl font-extrabold leading-tight tracking-normal">
            {campaignText.title}
          </h3>
          {campaign.coverImageUrl ? (
            <div
              aria-label={t.campaignDetail.coverAlt(campaignText.title)}
              className="h-20 w-20 shrink-0 rounded-[1.25rem] bg-neutral-100 bg-cover bg-center"
              role="img"
              style={{ backgroundImage: `url(${campaign.coverImageUrl})` }}
            />
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <p>
            <span className="text-neutral-500">
              {t.campaignList.responsible}
            </span>{" "}
            {campaign.organization ?? campaign.responsible}
          </p>
          {campaign.instagramHandle ? (
            <a
              className="inline-flex w-fit items-center gap-1 font-bold text-[#2D5D5E]"
              href={`https://instagram.com/${campaign.instagramHandle}`}
              rel="noreferrer"
              target="_blank"
            >
              <Instagram size={14} />
              @{campaign.instagramHandle}
            </a>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {campaign.receivingCategories.map((category) => (
            <span
              key={category}
              className="tag-pill border border-neutral-300 bg-[#FFFCF8] text-neutral-700"
            >
              {getReceivingCategoryLabel(category, locale)}
            </span>
          ))}
        </div>
        <Link
          className="btn-primary"
          href={getPublicCampaignPath(campaign.slug, locale)}
        >
          {t.campaignList.viewCampaign}
        </Link>
      </Card.Content>
    </Card>
  );
}
