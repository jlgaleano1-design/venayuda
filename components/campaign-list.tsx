"use client";

import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Campaign, receivingFilters, ReceivingCategory } from "@/lib/demo-data";
import { CampaignCard } from "./campaign-card";

type CampaignFilter = ReceivingCategory | "";

export function CampaignList({ campaigns }: { campaigns: Campaign[] }) {
  const [filter, setFilter] = useState<CampaignFilter>("");

  const filteredCampaigns = filter
    ? campaigns.filter((campaign) => campaign.receivingCategories.includes(filter))
    : campaigns;
  const selectedFilterLabel =
    receivingFilters.find((item) => item.key === filter)?.label ?? "esta opción";
  const hasPublishedCampaigns = campaigns.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="sticky top-0 z-10 -mx-[50vw] w-screen translate-x-1/2 border-y border-neutral-200 bg-[#FFFCF8]/95 py-3 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-2 md:hidden">
            <label
              className="shrink-0 text-sm font-black text-neutral-600"
              htmlFor="campaign-receiving-filter"
            >
              Puedo donar desde / con:
            </label>
            <select
              id="campaign-receiving-filter"
              className="field pr-10 font-black text-[#2A3534]"
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as CampaignFilter)
              }
            >
              <option value="">Seleccionar método</option>
              {receivingFilters.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="no-scrollbar hidden items-center gap-2 overflow-x-auto md:flex">
            <span className="shrink-0 text-sm font-black text-neutral-600">
              Puedo donar desde / con:
            </span>
            {receivingFilters.map((item) => {
              const isSelected = filter === item.key;

              return (
                <button
                  key={item.key}
                  aria-pressed={isSelected}
                  className={
                    isSelected
                      ? "h-9 shrink-0 rounded-full bg-[#2D5D5E] px-5 text-sm font-black text-[#FAE880]"
                      : "h-9 shrink-0 rounded-full bg-neutral-100 px-5 text-sm font-black text-[#2A3534]"
                  }
                  type="button"
                  onClick={() => setFilter(item.key)}
                >
                  {item.label}
                </button>
              );
            })}
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
                {hasPublishedCampaigns
                  ? `Todavía no hay campañas para ${selectedFilterLabel}`
                  : "Todavía no hay campañas publicadas"}
              </h3>
              <p className="max-w-2xl text-sm leading-6 text-neutral-600">
                {hasPublishedCampaigns
                  ? "Prueba con otro origen de donación o vuelve más tarde."
                  : "Las campañas aparecerán aquí cuando el equipo revise y publique las primeras solicitudes. Puedes crear la primera campaña para iniciar el flujo."}
              </p>
            </div>
            {!hasPublishedCampaigns ? (
              <Link className="btn-primary" href="/campanas/crear">
                <Plus size={18} />
                Crear primera campaña
              </Link>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
