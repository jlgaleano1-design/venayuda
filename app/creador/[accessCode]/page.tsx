import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreatorUpdateForm } from "@/components/creator-update-form";
import { SiteFooter } from "@/components/site-footer";
import { getCreatorAccessRecord } from "@/lib/creator-access";
import { formatUsd } from "@/lib/demo-data";

type CreatorPortalActivity = {
  donated: number | null;
  spent: number | null;
  balance: number | null;
  purchases: {
    title: string;
    amount: string;
    date: string;
  }[];
};

function getCreatorPortalActivity(): CreatorPortalActivity {
  return {
    donated: null,
    spent: null,
    balance: null,
    purchases: [],
  };
}

export const dynamic = "force-dynamic";

export default async function CreatorPortalPage({
  params,
}: {
  params: Promise<{ accessCode: string }>;
}) {
  const { accessCode } = await params;
  const accessRecord = await getCreatorAccessRecord(accessCode);

  if (!accessRecord) {
    notFound();
  }

  const campaign = accessRecord.campaign;
  const activity = getCreatorPortalActivity();

  return (
    <main className="min-h-screen bg-[#FFFCF8] text-[#121515]">
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

            <CreatorUpdateForm
              campaign={{
                creatorAccessCode: accessCode,
                slug: campaign.slug,
                title: campaign.title,
              }}
            />
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
                  emptyText="Sin donaciones verificadas"
                  value={
                    activity.donated === null
                      ? undefined
                      : formatUsd(activity.donated)
                  }
                />
                <Metric
                  label="Gastado aprobado"
                  emptyText="Sin gastos aprobados"
                  value={
                    activity.spent === null ? undefined : formatUsd(activity.spent)
                  }
                />
                <Metric
                  label="Saldo disponible"
                  emptyText="Pendiente por calcular"
                  value={
                    activity.balance === null
                      ? undefined
                      : formatUsd(activity.balance)
                  }
                />
                <p className="text-xs leading-5 text-neutral-600">
                  Estos datos se llenan solo con donaciones verificadas y compras
                  aprobadas.
                </p>
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
                <h2 className="text-xl font-extrabold">
                  Últimas compras aprobadas
                </h2>
                {activity.purchases.length > 0 ? (
                  activity.purchases.map((purchase) => (
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
                  ))
                ) : (
                  <EmptyState
                    title="Todavía no hay compras aprobadas"
                    body="Cuando subas una compra y pase revisión, aparecerá aquí con su monto y fecha."
                  />
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function Metric({
  emptyText,
  label,
  value,
}: {
  emptyText: string;
  label: string;
  value?: string;
}) {
  return (
    <div className="border-b border-neutral-200 pb-3">
      <p className="text-sm text-neutral-500">{label}</p>
      {value ? (
        <p className="text-2xl font-extrabold">{value}</p>
      ) : (
        <p className="mt-1 text-sm font-bold text-neutral-500">{emptyText}</p>
      )}
    </div>
  );
}

function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-[1.5rem] bg-neutral-50 p-4">
      <p className="font-extrabold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{body}</p>
    </div>
  );
}
