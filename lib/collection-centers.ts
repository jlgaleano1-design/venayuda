import type { SupabaseClient } from "@supabase/supabase-js";
import {
  collectionCenterFilters,
  type CollectionCenter,
  type CollectionCenterCategory,
} from "@/lib/collection-center-types";
export type { CollectionCenter, CollectionCenterCategory } from "@/lib/collection-center-types";

type CollectionCenterRow = {
  address: string | null;
  categories: string[] | null;
  city: string | null;
  contact: string | null;
  coordinates: string | null;
  country: string | null;
  id: string;
  name: string;
  receives: string | null;
};

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1OTNQGMsK3nU2wqy00rtPPcwsSzAlorWeP-uIotWpkxM/gviz/tq?tqx=out:csv&gid=115303742";
const COLLECTION_CENTERS_REVALIDATE_SECONDS = 60 * 60 * 24;

const collectionCenterColumns =
  "id, name, address, city, country, coordinates, receives, contact, categories";

export async function getCollectionCenters() {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("collection_centers")
      .select(collectionCenterColumns)
      .order("country", { ascending: true })
      .order("city", { ascending: true })
      .order("name", { ascending: true });

    if (!error && data && data.length > 0) {
      return (data as CollectionCenterRow[]).map(rowToPublicCollectionCenter);
    }
  } catch {
    // The public list should still render from the linked Sheet if Supabase is unavailable.
  }

  try {
    return await fetchCollectionCentersFromSheet({
      revalidate: COLLECTION_CENTERS_REVALIDATE_SECONDS,
    });
  } catch {
    return [];
  }
}

export async function fetchCollectionCentersFromSheet({
  revalidate,
}: {
  revalidate?: number;
} = {}) {
  const response = await fetch(SHEET_CSV_URL, {
    ...(revalidate ? { next: { revalidate } } : { cache: "no-store" }),
  });

  if (!response.ok) {
    throw new Error("No se pudo leer el sheet de centros de acopio.");
  }

  const csv = await response.text();
  return parseCollectionCentersCsv(csv);
}

export function parseCollectionCentersCsv(csv: string) {
  const rows = parseCsv(csv);
  const [headerRow] = rows;

  if (!headerRow) {
    throw new Error("El sheet de centros de acopio no tiene encabezados.");
  }

  const parsedRows = getCollectionCenterRows(rows);
  const { headers, rows: centerRows } = parsedRows;
  const missingHeaders = getMissingRequiredHeaders(headers);

  if (missingHeaders.length > 0) {
    throw new Error(
      `El sheet de centros de acopio no tiene las columnas requeridas: ${missingHeaders.join(
        ", ",
      )}.`,
    );
  }

  return centerRows
    .map((row, index) => rowToCollectionCenter(headers, row, index))
    .filter((center): center is CollectionCenter => Boolean(center));
}

function getCollectionCenterRows(rows: string[][]) {
  const [headerRow = [], ...dataRows] = rows;
  const headers = headerRow.map(normalizeHeader);

  if (getMissingRequiredHeaders(headers).length === 0) {
    return { headers, rows: dataRows };
  }

  const fallbackHeaders = [
    "id",
    "quien",
    "direccion",
    "ciudad",
    "coordenadas",
    "pais",
    "que reciben",
    "contacto",
  ];

  return {
    headers: fallbackHeaders,
    rows: rows.filter((row) => looksLikeCollectionCenterDataRow(row)),
  };
}

function getMissingRequiredHeaders(headers: string[]) {
  return ["id", "quien"].filter((header) => !headers.includes(header));
}

function looksLikeCollectionCenterDataRow(row: string[]) {
  const firstCell = cleanDisplayValue(row[0]);
  const name = cleanDisplayValue(row[1]);
  const address = cleanDisplayValue(row[2]);
  const country = cleanDisplayValue(row[5]);
  const receives = cleanDisplayValue(row[6]);

  return /^\d+$/.test(firstCell) && Boolean(name && address && country && receives);
}

export async function syncCollectionCentersFromSheet({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  const startedAt = new Date().toISOString();

  try {
    const centers = await fetchCollectionCentersFromSheet();
    const now = new Date().toISOString();
    const centerRows = centers.map((center) => ({
      address: center.address,
      categories: center.categories,
      city: center.city,
      contact: center.contact ?? null,
      coordinates: center.coordinates ?? null,
      country: center.country,
      id: center.id,
      name: center.name,
      receives: center.receives,
      synced_at: now,
    }));

    if (centerRows.length > 0) {
      const { error: upsertError } = await supabase
        .from("collection_centers")
        .upsert(centerRows, { onConflict: "id" });

      if (upsertError) {
        throw new Error("No se pudo guardar la caché de centros de acopio.");
      }
    }

    const { data: existingRows, error: selectError } = await supabase
      .from("collection_centers")
      .select("id");

    if (selectError) {
      throw new Error("No se pudo revisar la caché actual de centros de acopio.");
    }

    const syncedIds = new Set(centers.map((center) => center.id));
    const staleIds = (existingRows ?? [])
      .map((row) => row.id)
      .filter((id) => !syncedIds.has(id));

    if (staleIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("collection_centers")
        .delete()
        .in("id", staleIds);

      if (deleteError) {
        throw new Error("No se pudieron limpiar centros antiguos de la caché.");
      }
    }

    const finishedAt = new Date().toISOString();
    await supabase.from("collection_center_sync_runs").insert({
      center_count: centers.length,
      error_message: null,
      finished_at: finishedAt,
      started_at: startedAt,
      status: "success",
    });

    return {
      centerCount: centers.length,
      finishedAt,
      ok: true,
      startedAt,
    };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo sincronizar el sheet de centros de acopio.";

    await supabase.from("collection_center_sync_runs").insert({
      center_count: 0,
      error_message: message,
      finished_at: finishedAt,
      started_at: startedAt,
      status: "failed",
    });

    throw error;
  }
}

function rowToPublicCollectionCenter(row: CollectionCenterRow): CollectionCenter {
  const center: CollectionCenter = {
    address: row.address ?? "",
    categories: normalizeCategories(row.categories),
    city: row.city ?? "",
    country: row.country ?? "",
    id: row.id,
    name: row.name,
    receives: row.receives ?? "Centro de acopio",
  };

  if (row.coordinates) {
    center.coordinates = row.coordinates;
  }

  if (row.contact) {
    center.contact = row.contact;
  }

  return center;
}

function normalizeCategories(categories: string[] | null) {
  const allowed = new Set(collectionCenterFilters.map((filter) => filter.key));

  return (categories ?? []).filter(
    (category): category is Exclude<CollectionCenterCategory, "all"> =>
      category !== "all" && allowed.has(category as CollectionCenterCategory),
  );
}

function rowToCollectionCenter(
  headers: string[],
  row: string[],
  index: number,
): CollectionCenter | null {
  const value = (name: string) => cleanDisplayValue(row[headers.indexOf(name)]);
  const sheetId = value("id");
  const name = value("quien");
  const receives = value("que reciben");

  if (!sheetId || !name) {
    return null;
  }

  const coordinates = value("coordenadas");
  const contact = value("contacto");
  const center: CollectionCenter = {
    id: createCenterId(index, sheetId, name, value("direccion"), value("ciudad")),
    name,
    address: value("direccion"),
    city: value("ciudad"),
    country: value("pais"),
    receives: receives || "Centro de acopio",
    categories: getCategories(receives),
  };

  if (coordinates) {
    center.coordinates = coordinates;
  }

  if (contact) {
    center.contact = contact;
  }

  return center;
}

function getCategories(text: string) {
  const normalized = normalizeHeader(text);
  const categories = new Set<Exclude<CollectionCenterCategory, "all">>();

  if (
    /medic|medicamento|insumo medico|primeros auxilios|botiquin|curacion|cura|gasa|venda|suero|analgesico|antibiotico|farmaco/.test(
      normalized,
    )
  ) {
    categories.add("medicines");
  }

  if (
    /alimento|comida|agua|grano|arroz|pasta|enlatado|lata|leche|harina|no perecedero|formula/.test(
      normalized,
    )
  ) {
    categories.add("food");
  }

  if (
    /higiene|aseo|jabon|champu|shampoo|panal|pañal|toalla sanitaria|gel antibacterial|desinfectante/.test(
      normalized,
    )
  ) {
    categories.add("hygiene");
  }

  if (/ropa|vestimenta|abrigo|calzado|zapato|cobija|manta|sabana/.test(normalized)) {
    categories.add("clothing");
  }

  if (
    /insumo|linterna|pila|bateria|lona|guante|tapaboca|mascarilla|carpa|silbato|megafono|pala|colchon|power bank/.test(
      normalized,
    )
  ) {
    categories.add("supplies");
  }

  if (/mascota|animal|perro|gato/.test(normalized)) {
    categories.add("pets");
  }

  return [...categories];
}

function createCenterId(
  index: number,
  sheetId: string,
  name: string,
  address: string,
  city: string,
) {
  const slug = [sheetId, name, address, city]
    .filter(Boolean)
    .join("-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${slug || "centro"}-${index + 1}`;
}

function cleanDisplayValue(value?: string) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows.filter((item) => item.some(Boolean));
}
