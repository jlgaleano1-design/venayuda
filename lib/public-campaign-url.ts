import type { Route } from "next";

export const publicCampaignBasePath = "/venezuela";
export const legacyPublicCampaignBasePath = "/campanas";

export function getPublicCampaignPath(slug: string): Route {
  return `${publicCampaignBasePath}/${slug}` as Route;
}

export function getLegacyPublicCampaignPath(slug: string): Route {
  return `${legacyPublicCampaignBasePath}/${slug}` as Route;
}

export function getPublicDonationReportPath(slug: string): Route {
  return `${getPublicCampaignPath(slug)}?reportar=aporte` as Route;
}

export function getPublicCampaignThumbnailPath(slug: string): Route {
  return `/api/campaigns/${slug}/thumbnail` as Route;
}

export function getPublicCampaignUrl({
  siteUrl,
  slug,
}: {
  siteUrl: string;
  slug: string;
}) {
  return new URL(getPublicCampaignPath(slug), siteUrl).toString();
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
