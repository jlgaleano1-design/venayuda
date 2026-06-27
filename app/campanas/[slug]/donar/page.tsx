import { redirect } from "next/navigation";

export default async function DonationReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  redirect(`/campanas/${slug}?reportar=aporte`);
}
