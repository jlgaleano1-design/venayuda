import type { Metadata } from "next";
import {
  generateCampaignMetadata,
  PublicCampaignDetailPage,
} from "@/components/public-campaign-detail-page";

export const dynamic = "force-static";
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return generateCampaignMetadata({ locale: "en", params });
}

export default async function EnglishCampaignDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <PublicCampaignDetailPage locale="en" params={params} />;
}
