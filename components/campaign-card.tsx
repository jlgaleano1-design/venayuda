import { Card } from "@heroui/react";
import { Instagram, MapPin } from "lucide-react";
import Link from "next/link";
import { CampaignStatusPill } from "@/components/campaign-status-pill";
import { ShareCampaignButton } from "@/components/share-campaign-button";
import { Campaign } from "@/lib/demo-data";
import {
  getCampaignText,
  getDictionary,
  getReceivingCategoryLabel,
  type Locale,
} from "@/lib/i18n";
import {
  getPublicCampaignPath,
  getPublicCampaignUrl,
} from "@/lib/public-campaign-url";

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
  const campaignPath = getPublicCampaignPath(campaign.slug, locale);
  const publicCampaignUrl = getPublicCampaignUrl({
    locale,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendonar.org",
    slug: campaign.slug,
  });
  const shareCampaign = {
    affectedArea: campaign.affectedArea || campaign.location,
    coverImageUrl: campaign.coverImageUrl,
    publicUrl: publicCampaignUrl,
    responsible: campaign.responsible,
    slug: campaign.slug,
    title: campaignText.title,
  };

  return (
    <Card className="surface-card shadow-none">
      <Card.Content className="flex flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <CampaignStatusPill campaign={campaign} locale={locale} />
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
        <div className="grid gap-2 sm:grid-cols-2">
          <Link className="btn-primary justify-center" href={campaignPath}>
            {t.campaignList.viewCampaign}
          </Link>
          <ShareCampaignButton
            campaign={shareCampaign}
            className="justify-center"
            locale={locale}
          />
        </div>
      </Card.Content>
    </Card>
  );
}
