import { Card } from "@heroui/react";
import { Instagram, MapPin } from "lucide-react";
import Link from "next/link";
import { Campaign, formatUsdAprox } from "@/lib/demo-data";

const categoryLabels: Record<string, string> = {
  crypto: "Cripto",
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

const statusLabels: Record<Campaign["status"], string> = {
  active: "Activa",
  paused: "Pausada",
  completed: "Completada",
};

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <Card className="surface-card shadow-none">
      <Card.Content className="flex flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <span
            className={
              campaign.status === "active"
                ? "status-pill bg-emerald-50 text-emerald-800"
                : "status-pill bg-neutral-100 text-neutral-700"
            }
          >
            {statusLabels[campaign.status]}
          </span>
          <div className="flex items-center gap-1 text-xs text-neutral-600">
            <MapPin size={14} />
            {campaign.affectedArea}
          </div>
        </div>
        <div className="flex items-start justify-between gap-4">
          <h3 className="min-w-0 text-xl font-extrabold leading-tight tracking-normal">
            {campaign.title}
          </h3>
          {campaign.coverImageUrl ? (
            <div
              aria-label={`Foto de ${campaign.title}`}
              className="h-20 w-20 shrink-0 rounded-[1.25rem] bg-neutral-100 bg-cover bg-center"
              role="img"
              style={{ backgroundImage: `url(${campaign.coverImageUrl})` }}
            />
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <p>
            <span className="text-neutral-500">Responsable:</span>{" "}
            {campaign.organization ?? campaign.responsible}
          </p>
          {campaign.instagramHandle ? (
            <a
              className="inline-flex w-fit items-center gap-1 font-bold text-[#2D5D5E]"
              href={`https://instagram.com/${campaign.instagramHandle}`}
              rel="noreferrer"
              target="_blank"
            >
              <Instagram size={14} />
              @{campaign.instagramHandle}
            </a>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {campaign.receivingCategories.map((category) => (
            <span
              key={category}
              className="tag-pill border border-neutral-300 bg-[#FFFCF8] text-neutral-700"
            >
              {categoryLabels[category]}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 border-y border-neutral-200 py-4 text-sm">
          <Metric
            label="Recaudados"
            value={formatUsdAprox(campaign.totals.donated)}
          />
          <Metric
            label="Utilizados"
            value={formatUsdAprox(campaign.totals.spent)}
          />
          <Metric
            label="Disponibles"
            value={formatUsdAprox(campaign.totals.balance)}
          />
        </div>
        <Link className="btn-primary" href={`/campanas/${campaign.slug}`}>
          Ver campaña
        </Link>
      </Card.Content>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}
