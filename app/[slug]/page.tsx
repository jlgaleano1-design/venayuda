import { notFound, redirect } from "next/navigation";
import { getPublicCampaign } from "@/lib/campaign-data";

export const dynamic = "force-dynamic";

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

  redirect(`/campanas/${campaign.slug}`);
}
