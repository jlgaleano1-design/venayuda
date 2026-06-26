import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreatorUpdateForm } from "@/components/creator-update-form";
import { SiteFooter } from "@/components/site-footer";
import {
  campaigns,
  formatUsd,
  getCampaignByCreatorAccessCode,
} from "@/lib/demo-data";

export function generateStaticParams() {
  return campaigns.map((campaign) => ({
    accessCode: campaign.creatorAccessCode,
  }));
}

export default async function CreatorPortalPage({
  params,
}: {
  params: Promise<{ accessCode: string }>;
}) {
  const { accessCode } = await params;
  const campaign = getCampaignByCreatorAccessCode(accessCode);

  if (!campaign) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        <Link className="inline-flex w-fit items-center gap-2 text-sm" href="/">
          <ArrowLeft size={18} />
          Inicio
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="space-y-3">
              <span className="soft-pill">Portal del creador</span>
              <h1 className="text-3xl font-black tracking-normal md:text-4xl">
                Sube novedades de compras para tu campaña.
              </h1>
              <p className="max-w-3xl leading-7 text-neutral-700">
                Este espacio es para que {campaign.responsible} pueda reportar
                qué compró, cuánto costó y adjuntar una foto. Cada novedad queda
                pendiente hasta revisión.
              </p>
            </div>

            <CreatorUpdateForm campaign={campaign} />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
            <section className="surface-card">
              <div className="flex flex-col gap-4 p-5">
                <div>
                  <p className="text-sm text-neutral-500">Campaña</p>
                  <h2 className="text-xl font-extrabold">{campaign.title}</h2>
                </div>
                <Metric
                  label="Donado verificado"
                  value={formatUsd(campaign.totals.donated)}
                />
                <Metric
                  label="Gastado aprobado"
                  value={formatUsd(campaign.totals.spent)}
                />
                <Metric
                  label="Saldo disponible"
                  value={formatUsd(campaign.totals.balance)}
                />
                <Link
                  className="btn-secondary"
                  href={`/campanas/${campaign.slug}`}
                >
                  Ver página pública
                  <ExternalLink size={16} />
                </Link>
              </div>
            </section>

            <section className="surface-card">
              <div className="flex flex-col gap-4 p-5">
                <h2 className="text-xl font-extrabold">Últimas compras</h2>
                {campaign.purchases.map((purchase) => (
                  <div key={purchase.title} className="space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold">{purchase.title}</p>
                      <p className="whitespace-nowrap text-sm">
                        {purchase.amount}
                      </p>
                    </div>
                    <p className="text-sm text-neutral-600">{purchase.date}</p>
                    <div className="h-px bg-neutral-200" />
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-neutral-200 pb-3">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="text-2xl font-extrabold">{value}</p>
    </div>
  );
}
