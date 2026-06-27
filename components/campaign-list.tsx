"use client";

import { Button } from "@heroui/react";
import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Campaign, receivingFilters, ReceivingCategory } from "@/lib/demo-data";
import { CampaignCard } from "./campaign-card";

export function CampaignList({ campaigns }: { campaigns: Campaign[] }) {
  const [filter, setFilter] = useState<ReceivingCategory>("all");

  const filteredCampaigns =
    filter === "all"
      ? campaigns
      : campaigns.filter((campaign) =>
          campaign.receivingCategories.includes(filter),
        );

  return (
    <div className="flex flex-col gap-5">
      <div className="sticky top-0 z-10 -mx-6 border-y border-neutral-200 bg-[#FFFCF8]/95 py-2 backdrop-blur">
        <div className="no-scrollbar overflow-x-auto">
          <div className="mx-auto flex w-max min-w-full max-w-6xl items-center gap-2 px-6 py-3">
            <span className="shrink-0 text-sm font-black text-neutral-600">
              Puedo donar a una cuenta en:
            </span>
            {receivingFilters.map((item) => (
              <Button
                key={item.key}
                className={
                  filter === item.key
                    ? "h-9 shrink-0 !rounded-full bg-[#2D5D5E] px-5 text-sm font-black text-[#FAE880]"
                    : "h-9 shrink-0 !rounded-full bg-neutral-100 px-5 text-sm font-black text-[#2A3534]"
                }
                type="button"
                variant={filter === item.key ? "primary" : "secondary"}
                onPress={() => setFilter(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {filteredCampaigns.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {filteredCampaigns.map((campaign: Campaign) => (
            <CampaignCard key={campaign.slug} campaign={campaign} />
          ))}
        </div>
      ) : (
        <section className="surface-card">
          <div className="flex flex-col items-start gap-4 p-8">
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-neutral-100 text-[#2D5D5E]">
              <ClipboardList size={22} />
            </span>
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold">
                Todavía no hay campañas publicadas
              </h3>
              <p className="max-w-2xl text-sm leading-6 text-neutral-600">
                Las campañas aparecerán aquí cuando el equipo revise y publique
                las primeras solicitudes. Puedes crear la primera campaña para
                iniciar el flujo.
              </p>
            </div>
            <Link className="btn-primary" href="/campanas/crear">
              <Plus size={18} />
              Crear primera campaña
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
