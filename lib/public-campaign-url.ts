import type { Route } from "next";
import type { Locale } from "@/lib/i18n";

export const publicCampaignBasePath = "/venezuela";
export const englishPublicBasePath = "/en";
export const englishPublicCampaignBasePath = "/en/venezuela";
export const legacyPublicCampaignBasePath = "/campanas";

export function getHomePath(locale: Locale = "es"): Route {
  return (locale === "en" ? englishPublicBasePath : "/") as Route;
}

export function getCampaignsAnchorPath(locale: Locale = "es"): Route {
  return `${getHomePath(locale)}#campanas` as Route;
}

export function getPublicCampaignPath(
  slug: string,
  locale: Locale = "es",
): Route {
  const basePath =
    locale === "en" ? englishPublicCampaignBasePath : publicCampaignBasePath;

  return `${basePath}/${slug}` as Route;
}

export function getLegacyPublicCampaignPath(slug: string): Route {
  return `${legacyPublicCampaignBasePath}/${slug}` as Route;
}

export function getPublicDonationReportPath(
  slug: string,
  locale: Locale = "es",
): Route {
  return `${getPublicCampaignPath(slug, locale)}?reportar=aporte` as Route;
}

export function getPublicDonationReportPagePath(
  slug: string,
  locale: Locale = "es",
): Route {
  return `${getPublicCampaignPath(slug, locale)}/donar` as Route;
}

export function getPublicCampaignThumbnailPath(slug: string): Route {
  return `/api/campaigns/${slug}/thumbnail` as Route;
}

export function getPublicCampaignUrl({
  locale = "es",
  siteUrl,
  slug,
}: {
  locale?: Locale;
  siteUrl: string;
  slug: string;
}) {
  return new URL(getPublicCampaignPath(slug, locale), siteUrl).toString();
}

export function getPublicCampaignThumbnailUrl({
  siteUrl,
  slug,
}: {
  siteUrl: string;
  slug: string;
}) {
  return new URL(getPublicCampaignThumbnailPath(slug), siteUrl).toString();
}
