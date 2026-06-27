"use client";

import { useMemo, useState } from "react";
import {
  collectionCenterFilters,
  type CollectionCenter,
  type CollectionCenterCategory,
} from "@/lib/collection-center-types";
import { CollectionCenterCard } from "./collection-center-card";

export function CollectionCenterList({
  centers,
}: {
  centers: CollectionCenter[];
}) {
  const [filter, setFilter] = useState<CollectionCenterCategory>("all");
  const [country, setCountry] = useState("all");
  const [city, setCity] = useState("all");

  const countries = useMemo(
    () => getOptions(centers.map((center) => center.country)),
    [centers],
  );

  const cities = useMemo(
    () =>
      getOptions(
        centers
          .filter((center) => country === "all" || center.country === country)
          .map((center) => center.city),
      ),
    [centers, country],
  );

  const filteredCenters = useMemo(() => {
    return centers.filter((center) => {
      const matchesCategory =
        filter === "all" || center.categories.includes(filter);
      const matchesCountry = country === "all" || center.country === country;
      const matchesCity = city === "all" || center.city === city;

      return matchesCategory && matchesCountry && matchesCity;
    });
  }, [centers, city, country, filter]);

  return (
    <div className="flex flex-col gap-5">
      <div className="sticky top-0 z-20 -mx-6 border-y border-neutral-200 bg-[#FFFCF8]/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto grid max-w-6xl gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {collectionCenterFilters.map((item) => (
              <button
                key={item.key}
                aria-pressed={filter === item.key}
                className={
                  filter === item.key
                    ? "h-9 shrink-0 !rounded-full bg-[#2D5D5E] px-5 text-sm font-black text-[#FAE880]"
                    : "h-9 shrink-0 !rounded-full bg-neutral-100 px-5 text-sm font-black text-[#161d21]"
                }
                type="button"
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <label className="sr-only" htmlFor="country-filter">
              Filtrar por país
            </label>
            <select
              id="country-filter"
              className="field pr-10"
              value={country}
              onChange={(event) => {
                setCountry(event.target.value);
                setCity("all");
              }}
            >
              <option value="all">Todos los países</option>
              {countries.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="city-filter">
              Filtrar por ciudad
            </label>
            <select
              id="city-filter"
              className="field pr-10"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            >
              <option value="all">Todas las ciudades</option>
              {cities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <div className="flex h-11 items-center text-sm font-bold text-neutral-600">
              {filteredCenters.length} centros
            </div>
          </div>
        </div>
      </div>

      {filteredCenters.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {filteredCenters.map((center: CollectionCenter, index) => (
            <CollectionCenterCard
              key={`${center.id}-${index}`}
              center={center}
            />
          ))}
        </div>
      ) : (
        <div className="surface-card p-8 text-sm text-neutral-600">
          No hay centros de acopio para este filtro todavía.
        </div>
      )}
    </div>
  );
}

function getOptions(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "es"),
  );
}
