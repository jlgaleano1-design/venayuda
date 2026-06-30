export type ReceivingCategory =
  | "crypto"
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
  receivingCategory: ReceivingCategory;
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
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  responsible: string;
  responsibleEmail: string;
  instagramHandle?: string;
  organization?: string;
  coverImageUrl?: string;
  location: string;
  affectedArea: string;
  verifiedByVendonar?: boolean;
  status: "active" | "paused" | "completed";
  receivingCategories: ReceivingCategory[];
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
    status?: "pending" | "verified";
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
  { key: "crypto", label: "Cripto" },
  { key: "mexico", label: "México" },
  { key: "united_states", label: "Estados Unidos" },
  { key: "venezuela", label: "Venezuela" },
  { key: "spain", label: "España" },
  { key: "panama", label: "Panamá" },
  { key: "colombia", label: "Colombia" },
  { key: "chile", label: "Chile" },
  { key: "argentina", label: "Argentina" },
  { key: "international", label: "Internacional" },
];

export const campaigns: Campaign[] = [];

export function formatUsd(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatUsdAprox(value: number) {
  return `${new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 0,
  }).format(value)} USD`;
}

export function formatOriginalAndUsd({
  amountOriginal,
  amountUsdEstimated,
  currencyOriginal,
}: {
  amountOriginal: number | string;
  amountUsdEstimated?: number | string | null;
  currencyOriginal: string;
}) {
  const originalCurrency = currencyOriginal.trim().toUpperCase();
  const original = formatCurrencyAmount(Number(amountOriginal), originalCurrency);

  if (amountUsdEstimated === null || amountUsdEstimated === undefined) {
    return original;
  }

  const usdAmount = Number(amountUsdEstimated);

  if (!Number.isFinite(usdAmount)) {
    return original;
  }

  if (originalCurrency === "USD" && Number(amountOriginal) === usdAmount) {
    return original;
  }

  return `${original} · ${formatCurrencyAmount(usdAmount, "USD")}`;
}

function formatCurrencyAmount(amount: number, currency: string) {
  if (!Number.isFinite(amount)) {
    return `${amount} ${currency}`;
  }

  try {
    const formatted = new Intl.NumberFormat("es-MX", {
      currency,
      currencyDisplay: "code",
      maximumFractionDigits: currency === "USD" ? 0 : 2,
      style: "currency",
    }).format(amount);

    return formatted;
  } catch {
    return `${new Intl.NumberFormat("es-MX", {
      maximumFractionDigits: 2,
    }).format(amount)} ${currency}`;
  }
}
