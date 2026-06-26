import { Card } from "@heroui/react";
import { Instagram, MapPin } from "lucide-react";
import Link from "next/link";
import { Campaign, formatUsd } from "@/lib/demo-data";

const categoryLabels: Record<string, string> = {
  mexico: "Dona desde México",
  united_states: "Dona desde Estados Unidos",
  venezuela: "Dona desde Venezuela",
  international: "Dona desde otro país",
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
        <div className="space-y-2">
          <h3 className="text-xl font-extrabold tracking-normal">
            {campaign.title}
          </h3>
          <p className="text-sm leading-6 text-neutral-600">
            {campaign.description}
          </p>
        </div>
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-neutral-500">Responsable:</span>{" "}
            {campaign.organization ?? campaign.responsible}
          </p>
          <p>
            <span className="text-neutral-500">Zona:</span> {campaign.location}
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
              className="tag-pill border border-neutral-300 bg-white text-neutral-700"
            >
              {categoryLabels[category]}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 border-y border-neutral-200 py-4 text-sm">
          <Metric label="Verificado" value={formatUsd(campaign.totals.donated)} />
          <Metric label="Gastado" value={formatUsd(campaign.totals.spent)} />
          <Metric label="Saldo" value={formatUsd(campaign.totals.balance)} />
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
