"use client";

import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Campaign, receivingFilters, ReceivingCategory } from "@/lib/demo-data";
import {
  getDictionary,
  getReceivingCategoryLabel,
  type Locale,
} from "@/lib/i18n";
import { CampaignCard } from "./campaign-card";

type CampaignFilter = ReceivingCategory | "";

export function CampaignList({
  campaigns,
  locale = "es",
}: {
  campaigns: Campaign[];
  locale?: Locale;
}) {
  const [filter, setFilter] = useState<CampaignFilter>("");
  const t = getDictionary(locale).campaignList;

  const availableReceivingFilters = useMemo(() => {
    const availableCategories = new Set(
      campaigns.flatMap((campaign) => campaign.receivingCategories),
    );

    return receivingFilters.filter((item) => availableCategories.has(item.key));
  }, [campaigns]);

  const filteredCampaigns = filter
    ? campaigns.filter((campaign) => campaign.receivingCategories.includes(filter))
    : campaigns;
  const selectedFilterLabel =
    receivingFilters.find((item) => item.key === filter)
      ? getReceivingCategoryLabel(filter, locale)
      : t.fallbackFilter;
  const hasPublishedCampaigns = campaigns.length > 0;
  const hasAvailableFilters = availableReceivingFilters.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {hasAvailableFilters ? (
        <div className="sticky top-0 z-10 -mx-6 border-y border-neutral-200 bg-[#FFFCF8]/95 px-6 py-3 backdrop-blur">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-2 md:hidden">
              <label
                className="shrink-0 text-sm font-black text-neutral-600"
                htmlFor="campaign-receiving-filter"
              >
                {t.filterLabel}
              </label>
              <select
                id="campaign-receiving-filter"
                className="field pr-10 font-black text-[#2A3534]"
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as CampaignFilter)
                }
              >
                <option value="">{t.allMethods}</option>
                {availableReceivingFilters.map((item) => (
                  <option key={item.key} value={item.key}>
                    {getReceivingCategoryLabel(item.key, locale)}
                  </option>
                ))}
              </select>
            </div>

            <div className="no-scrollbar hidden items-center gap-2 overflow-x-auto md:flex">
              <span className="shrink-0 text-sm font-black text-neutral-600">
                {t.filterLabel}
              </span>
              {availableReceivingFilters.map((item) => {
                const isSelected = filter === item.key;

                return (
                  <button
                    key={item.key}
                    aria-pressed={isSelected}
                    className={
                      isSelected
                        ? "h-9 shrink-0 rounded-full bg-[#2D5D5E] px-5 text-sm font-black text-[#FAE880]"
                        : "h-9 shrink-0 rounded-full border border-neutral-200 bg-white px-5 text-sm font-black text-[#2A3534] shadow-sm"
                    }
                    type="button"
                    onClick={() =>
                      setFilter((currentFilter) =>
                        currentFilter === item.key ? "" : item.key,
                      )
                    }
                  >
                    {getReceivingCategoryLabel(item.key, locale)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {filteredCampaigns.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {filteredCampaigns.map((campaign: Campaign) => (
            <CampaignCard
              key={campaign.slug}
              campaign={campaign}
              locale={locale}
            />
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
                  ? t.emptyForFilter(selectedFilterLabel)
                  : t.emptyTitle}
              </h3>
              <p className="max-w-2xl text-sm leading-6 text-neutral-600">
                {hasPublishedCampaigns
                  ? t.emptyFilterBody
                  : t.emptyBody}
              </p>
            </div>
            {!hasPublishedCampaigns ? (
              <Link className="btn-primary" href="/campanas/crear">
                <Plus size={18} />
                {t.createFirstCampaign}
              </Link>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
