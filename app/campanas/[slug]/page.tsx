import { permanentRedirect } from "next/navigation";
import {
  getPublicCampaignPath,
  getPublicDonationReportPath,
} from "@/lib/public-campaign-url";

export default async function LegacyCampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ reportar?: string }>;
}) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const targetPath = getPublicCampaignPath(slug);

  permanentRedirect(
    query.reportar === "aporte" ? getPublicDonationReportPath(slug) : targetPath,
  );
}
