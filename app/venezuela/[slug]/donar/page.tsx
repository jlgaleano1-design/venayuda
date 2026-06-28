import { redirect } from "next/navigation";
import { getPublicDonationReportPath } from "@/lib/public-campaign-url";

export default async function DonationReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  redirect(getPublicDonationReportPath(slug));
}
