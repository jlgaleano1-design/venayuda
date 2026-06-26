import { Card, Chip } from "@heroui/react";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { Campaign, formatUsd } from "@/lib/demo-data";

const categoryLabels: Record<string, string> = {
  mexico: "Mexico",
  united_states: "Estados Unidos",
  venezuela: "Venezuela",
  international: "Internacional",
};

const statusLabels: Record<Campaign["status"], string> = {
  active: "Activa",
  paused: "Pausada",
  completed: "Completada",
};

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <Card className="border border-neutral-200 shadow-none">
      <Card.Content className="flex flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <Chip
            className={
              campaign.status === "active"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-neutral-100 text-neutral-700"
            }
            size="sm"
            variant="soft"
          >
            {statusLabels[campaign.status]}
          </Chip>
          <div className="flex items-center gap-1 text-xs text-neutral-600">
            <MapPin size={14} />
            {campaign.affectedArea}
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold tracking-normal">
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
        </div>
        <div className="flex flex-wrap gap-2">
          {campaign.receivingCategories.map((category) => (
            <Chip
              key={category}
              className="border border-neutral-300 bg-white text-neutral-700"
              size="sm"
              variant="secondary"
            >
              {categoryLabels[category]}
            </Chip>
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
      <p className="font-semibold">{value}</p>
    </div>
  );
}
