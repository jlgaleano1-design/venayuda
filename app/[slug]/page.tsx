import { notFound, redirect } from "next/navigation";
import { campaigns, getCampaign } from "@/lib/demo-data";

export function generateStaticParams() {
  return campaigns.map((campaign) => ({ slug: campaign.slug }));
}

export default async function SharedCampaignPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const campaign = getCampaign(slug);

  if (!campaign) {
    notFound();
  }

  redirect(`/campanas/${campaign.slug}`);
}
