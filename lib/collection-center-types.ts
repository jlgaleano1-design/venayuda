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
