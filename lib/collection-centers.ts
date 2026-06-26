export type CollectionCenterCategory =
  | "all"
  | "medicines"
  | "food"
  | "hygiene"
  | "clothing"
  | "supplies"
  | "pets";

export type CollectionCenter = {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  coordinates?: string;
  receives: string;
  contact?: string;
  categories: Exclude<CollectionCenterCategory, "all">[];
};

export const collectionCenterFilters: {
  key: CollectionCenterCategory;
  label: string;
}[] = [
  { key: "all", label: "Todo" },
  { key: "medicines", label: "Medicinas" },
  { key: "food", label: "Alimentos" },
  { key: "hygiene", label: "Higiene" },
  { key: "clothing", label: "Ropa" },
  { key: "supplies", label: "Insumos" },
  { key: "pets", label: "Mascotas" },
];

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1OTNQGMsK3nU2wqy00rtPPcwsSzAlorWeP-uIotWpkxM/gviz/tq?tqx=out:csv&gid=115303742";

export async function getCollectionCentersFromSheet() {
  const response = await fetch(SHEET_CSV_URL, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error("No se pudo leer el sheet de centros de acopio.");
  }

  const csv = await response.text();
  const rows = parseCsv(csv);
  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map(normalizeHeader);

  return dataRows
    .map((row, index) => rowToCollectionCenter(headers, row, index))
    .filter((center): center is CollectionCenter => Boolean(center));
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
