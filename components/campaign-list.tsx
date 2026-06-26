"use client";

import { Button } from "@heroui/react";
import { useMemo, useState } from "react";
import { Campaign, campaigns, receivingFilters, ReceivingCategory } from "@/lib/demo-data";
import { CampaignCard } from "./campaign-card";

export function CampaignList() {
  const [filter, setFilter] = useState<ReceivingCategory>("all");

  const filteredCampaigns = useMemo(() => {
    if (filter === "all") {
      return campaigns;
    }

    return campaigns.filter((campaign) =>
      campaign.receivingCategories.includes(filter),
    );
  }, [filter]);

  return (
    <div className="flex flex-col gap-5">
      <div className="sticky top-0 z-10 -mx-6 border-y border-neutral-200 bg-white/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto">
          {receivingFilters.map((item) => (
            <Button
              key={item.key}
              className={
                filter === item.key
                  ? "h-9 shrink-0 bg-[#2D5D5E] px-3 text-sm font-medium text-[#FAE880]"
                  : "h-9 shrink-0 bg-neutral-100 px-3 text-sm font-medium text-black"
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

      {filteredCampaigns.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {filteredCampaigns.map((campaign: Campaign) => (
            <CampaignCard key={campaign.slug} campaign={campaign} />
          ))}
        </div>
      ) : (
        <div className="border border-neutral-200 p-8 text-sm text-neutral-600">
          No hay campañas activas para este filtro todavía.
        </div>
      )}
    </div>
  );
}
