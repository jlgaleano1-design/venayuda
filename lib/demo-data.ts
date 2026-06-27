export type ReceivingCategory =
  | "all"
  | "mexico"
  | "united_states"
  | "venezuela"
  | "spain"
  | "panama"
  | "colombia"
  | "chile"
  | "argentina"
  | "international";

export type PaymentMethod = {
  id: string;
  receivingCategory: Exclude<ReceivingCategory, "all">;
  label: string;
  currency: string;
  accountHolder: string;
  instructions: string;
  notes?: string;
};

export type Campaign = {
  slug: string;
  creatorAccessCode: string;
  title: string;
  description: string;
  responsible: string;
  responsibleEmail: string;
  instagramHandle?: string;
  organization?: string;
  location: string;
  affectedArea: string;
  status: "active" | "paused" | "completed";
  receivingCategories: Exclude<ReceivingCategory, "all">[];
  totals: {
    donated: number;
    spent: number;
    balance: number;
  };
  paymentMethods: PaymentMethod[];
  donations: {
    code: string;
    donor: string;
    amount: string;
    message?: string;
    date: string;
  }[];
  purchases: {
    title: string;
    description?: string;
    amount: string;
    date: string;
    invoicePublic: boolean;
    photoUrl?: string;
  }[];
};

export const receivingFilters: { key: ReceivingCategory; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "mexico", label: "México" },
  { key: "united_states", label: "Estados Unidos" },
  { key: "venezuela", label: "Venezuela" },
  { key: "spain", label: "España" },
  { key: "panama", label: "Panamá" },
  { key: "colombia", label: "Colombia" },
  { key: "chile", label: "Chile" },
  { key: "argentina", label: "Argentina" },
  { key: "international", label: "Otros países" },
];

export const campaigns: Campaign[] = [];

export function formatUsd(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
