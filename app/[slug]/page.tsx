import { notFound, redirect } from "next/navigation";
import { getPublicCampaign } from "@/lib/campaign-data";
import { getPublicCampaignPath } from "@/lib/public-campaign-url";

export const dynamic = "force-static";
export const revalidate = 60;

export default async function SharedCampaignPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const campaign = await getPublicCampaign(slug);

  if (!campaign) {
    notFound();
  }

  redirect(getPublicCampaignPath(campaign.slug));
}
