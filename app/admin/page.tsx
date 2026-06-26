import { ArrowLeft, CheckCircle2, CircleDollarSign, FileClock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { campaigns, formatUsd } from "@/lib/demo-data";

export default function AdminPage() {
  const pendingDonations = campaigns.flatMap((campaign) =>
    campaign.donations.slice(0, 1).map((donation) => ({
      campaign: campaign.title,
      ...donation,
    })),
  );

  return (
    <main className="min-h-screen bg-white text-black">
      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-2">
            <span className="soft-pill">
              Admin MVP
            </span>
            <h1 className="text-3xl font-black tracking-normal">
              Revisión manual
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-neutral-600">
              Panel operativo para aprobar campañas, verificar reportes de
              donación y publicar compras. La conexión real a Supabase será el
              siguiente ajuste.
            </p>
          </div>
          <Link className="inline-flex items-center gap-2 text-sm" href="/">
            <ArrowLeft size={18} />
            Ver sitio
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            icon={<FileClock size={20} />}
            label="Campañas activas"
            value={String(campaigns.length)}
          />
          <SummaryCard
            icon={<CircleDollarSign size={20} />}
            label="Total verificado"
            value={formatUsd(
              campaigns.reduce((sum, campaign) => sum + campaign.totals.donated, 0),
            )}
          />
          <SummaryCard
            icon={<CheckCircle2 size={20} />}
            label="Saldo disponible"
            value={formatUsd(
              campaigns.reduce((sum, campaign) => sum + campaign.totals.balance, 0),
            )}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <QueueCard
            title="Solicitudes de campaña"
            items={campaigns.map((campaign) => ({
              title: campaign.title,
              meta: campaign.responsible,
              badge: campaign.status,
            }))}
          />
          <QueueCard
            title="Donaciones por verificar"
            items={pendingDonations.map((donation) => ({
              title: donation.amount,
              meta: `${donation.campaign} · ${donation.code}`,
              badge: "pending",
            }))}
          />
          <QueueCard
            title="Compras por aprobar"
            items={campaigns.flatMap((campaign) =>
              campaign.purchases.slice(0, 1).map((purchase) => ({
                title: purchase.title,
                meta: `${campaign.title} · ${purchase.amount}`,
                badge: "pending",
              })),
            )}
          />
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <section className="surface-card">
      <div className="flex flex-col gap-3 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">
          {icon}
        </div>
        <p className="text-sm text-neutral-600">{label}</p>
        <p className="text-2xl font-extrabold">{value}</p>
      </div>
    </section>
  );
}

function QueueCard({
  title,
  items,
}: {
  title: string;
  items: { title: string; meta: string; badge: string }[];
}) {
  return (
    <section className="surface-card">
      <div className="flex flex-col gap-4 p-5">
        <h2 className="text-lg font-extrabold">{title}</h2>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={`${item.title}-${item.meta}`}
              className="border-b border-neutral-200 pb-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{item.title}</p>
                  <p className="mt-1 text-sm text-neutral-600">{item.meta}</p>
                </div>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">
                  {item.badge}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
