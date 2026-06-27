import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DonationReportForm } from "@/components/donation-report-form";
import { SiteFooter } from "@/components/site-footer";
import { getPublicCampaign } from "@/lib/campaign-data";

export function generateStaticParams() {
  return [];
}

export default async function DonationReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const campaign = await getPublicCampaign(slug);

  if (!campaign) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#FFFCF8] text-[#121515]">
      <section className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm"
          href={`/campanas/${campaign.slug}`}
        >
          <ArrowLeft size={18} />
          Volver a la campaña
        </Link>

        <div className="space-y-3">
          <span className="soft-pill">
            Avisar que doné
          </span>
          <h1 className="text-3xl font-black tracking-normal">
            Reporta tu aporte a {campaign.title}
          </h1>
          <p className="leading-7 text-neutral-700">
            Este formulario no procesa pagos. Solo registra que donaste por un
            método externo para que el equipo pueda revisar el comprobante y
            publicar el aporte cuando sea verificado.
          </p>
        </div>

        <DonationReportForm campaign={campaign} />
      </section>
      <SiteFooter />
    </main>
  );
}
