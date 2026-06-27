import { Card } from "@heroui/react";
import { ExternalLink, MapPin, MessageCircle, PackageCheck } from "lucide-react";
import type { CollectionCenter } from "@/lib/collection-center-types";

const categoryLabels: Record<string, string> = {
  medicines: "Medicinas",
  food: "Alimentos",
  hygiene: "Higiene",
  clothing: "Ropa",
  supplies: "Insumos",
  pets: "Mascotas",
};

export function CollectionCenterCard({
  center,
}: {
  center: CollectionCenter;
}) {
  const mapUrl = center.coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        center.coordinates,
      )}`
    : undefined;
  const contactIsUrl = center.contact?.startsWith("http");

  return (
    <Card className="surface-card min-w-0 overflow-hidden shadow-none">
      <Card.Content className="flex h-full min-w-0 flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="status-pill bg-emerald-50 text-emerald-800">
            Centro de acopio
          </span>
          <div className="flex items-center gap-1 text-xs text-neutral-600">
            <MapPin size={14} />
            {center.country || "Sin país"}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-extrabold tracking-normal">
            {center.name}
          </h3>
          <p className="text-sm leading-6 text-neutral-600">
            {center.city || "Ciudad por confirmar"}
            {center.address ? ` · ${center.address}` : ""}
          </p>
        </div>

        <div className="grid gap-3 text-sm text-neutral-700">
          {center.contact ? (
            <div className="flex gap-2">
              <MessageCircle
                className="mt-0.5 shrink-0 text-[#2D5D5E]"
                size={16}
              />
              {contactIsUrl ? (
                <a
                  className="break-words font-bold text-[#2D5D5E] underline-offset-4 hover:underline"
                  href={center.contact}
                  rel="noreferrer"
                  target="_blank"
                >
                  Ver contacto <ExternalLink className="inline" size={13} />
                </a>
              ) : (
                <span>{center.contact}</span>
              )}
            </div>
          ) : null}

          {mapUrl ? (
            <a
              className="flex gap-2 font-bold text-[#2D5D5E] underline-offset-4 hover:underline"
              href={mapUrl}
              rel="noreferrer"
              target="_blank"
            >
              <MapPin className="mt-0.5 shrink-0" size={16} />
              Abrir ubicación
            </a>
          ) : null}
        </div>

        {center.categories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {center.categories.map((category) => (
              <span
                key={category}
                className="tag-pill border border-neutral-300 bg-[#FFFCF8] text-neutral-700"
              >
                {categoryLabels[category]}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto space-y-3 border-t border-neutral-200 pt-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <PackageCheck size={16} />
            Qué recibe
          </div>
          <p className="text-sm leading-6 text-neutral-600">{center.receives}</p>
        </div>
      </Card.Content>
    </Card>
  );
}
