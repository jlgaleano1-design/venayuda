import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, Instagram } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { getPublicCampaign } from "@/lib/campaign-data";
import { formatUsd } from "@/lib/demo-data";

const categoryLabels: Record<string, string> = {
  mexico: "México",
  united_states: "Estados Unidos",
  venezuela: "Venezuela",
  spain: "España",
  panama: "Panamá",
  colombia: "Colombia",
  chile: "Chile",
  argentina: "Argentina",
  international: "Otros países",
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getPublicCampaign(slug);

  if (!campaign) {
    return {
      title: "Campaña no encontrada",
    };
  }

  return {
    title: campaign.title,
    description: campaign.description,
    openGraph: {
      title: campaign.title,
      description: campaign.description,
      url: `/campanas/${campaign.slug}`,
      images: [
        {
          url: "/opengraph-image.png",
          width: 1200,
          height: 630,
          alt: campaign.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: campaign.title,
      description: campaign.description,
      images: ["/opengraph-image.png"],
    },
  };
}

export default async function CampaignDetailPage({
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
      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm"
          href="/#campanas"
        >
          <ArrowLeft size={18} />
          Campañas
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="status-pill bg-emerald-50 text-emerald-800">
                  {campaign.status === "active" ? "Activa" : "Pausada"}
                </span>
                <span className="tag-pill min-h-7 bg-neutral-100 text-neutral-700">
                  {campaign.location}
                </span>
              </div>
              <h1 className="text-4xl font-black leading-tight tracking-normal md:text-5xl">
                {campaign.title}
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-neutral-700">
                {campaign.description}
              </p>
            </div>

            <section className="surface-card">
              <div className="flex flex-col gap-4 p-5">
                <h2 className="text-xl font-extrabold">Quién responde</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  <Info label="Responsable" value={campaign.responsible} />
                  <Info
                    label="Organización"
                    value={campaign.organization ?? "Independiente"}
                  />
                  <Info label="Zona afectada" value={campaign.affectedArea} />
                </div>
                {campaign.instagramHandle ? (
                  <a
                    className="inline-flex w-fit items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-sm font-extrabold text-[#2D5D5E]"
                    href={`https://instagram.com/${campaign.instagramHandle}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Instagram size={16} />
                    @{campaign.instagramHandle}
                    <ExternalLink size={14} />
                  </a>
                ) : null}
              </div>
            </section>

            <section className="surface-card">
              <div className="flex flex-col gap-4 p-5">
                <h2 className="text-xl font-extrabold">Métodos disponibles</h2>
                <div className="grid gap-3">
                  {campaign.paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="rounded-[1.5rem] border border-neutral-200 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="tag-pill border border-neutral-300 bg-[#FFFCF8] text-neutral-700">
                          {categoryLabels[method.receivingCategory]}
                        </span>
                        <p className="font-bold">{method.label}</p>
                        <p className="text-sm text-neutral-600">
                          {method.currency}
                        </p>
                      </div>
                      <p className="mt-3 text-sm text-neutral-600">
                        Titular: {method.accountHolder}
                      </p>
                      <p className="mt-2 text-sm leading-6">
                        {method.instructions}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="surface-card">
                <div className="flex flex-col gap-4 p-5">
                  <h2 className="text-xl font-extrabold">
                    Donaciones verificadas
                  </h2>
                  {campaign.donations.map((donation) => (
                    <div key={donation.code} className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold">{donation.amount}</p>
                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">
                          {donation.code}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600">
                        {donation.donor} · {donation.date}
                      </p>
                      {donation.message ? (
                        <p className="text-sm">{donation.message}</p>
                      ) : null}
                      <div className="h-px bg-neutral-200" />
                    </div>
                  ))}
                </div>
              </section>

              <section className="surface-card">
                <div className="flex flex-col gap-4 p-5">
                  <h2 className="text-xl font-extrabold">Compras aprobadas</h2>
                  {campaign.purchases.map((purchase) => (
                    <div key={purchase.title} className="space-y-3">
                      {purchase.photoUrl ? (
                        <div
                          aria-label={`Foto de ${purchase.title}`}
                          className="h-40 w-full rounded-[1.5rem] bg-cover bg-center"
                          role="img"
                          style={{ backgroundImage: `url(${purchase.photoUrl})` }}
                        />
                      ) : null}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-bold">{purchase.title}</p>
                          <p className="text-sm">{purchase.amount}</p>
                        </div>
                        {purchase.description ? (
                          <p className="text-sm leading-6 text-neutral-700">
                            {purchase.description}
                          </p>
                        ) : null}
                        <p className="text-sm text-neutral-600">
                          {purchase.date} ·{" "}
                          {purchase.invoicePublic
                            ? "Comprobante publico"
                            : "Comprobante privado"}
                        </p>
                      </div>
                      <div className="h-px bg-neutral-200" />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
            <section className="surface-card">
              <div className="flex flex-col gap-4 p-5">
                <h2 className="text-xl font-extrabold">Transparencia</h2>
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
                  className="btn-primary"
                  href={`/campanas/${campaign.slug}/donar`}
                >
                  Avisar que doné
                  <ExternalLink size={16} />
                </Link>
                <p className="text-xs leading-5 text-neutral-600">
                  Dona por fuera usando uno de los métodos disponibles. Luego
                  reporta tu aporte para que pueda revisarse manualmente.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
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
