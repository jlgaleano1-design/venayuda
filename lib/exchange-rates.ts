type UsdEstimate =
  | {
      amount: number;
      conversionNotes: string;
      exchangeRateDate: string;
      exchangeRateSource: string;
      exchangeRateUsed: number;
    }
  | {
      error: string;
    };

const defaultRateApiUrl = "https://open.er-api.com/v6/latest/USD";
const stableUsdCurrencies = new Set(["USD", "USDC", "USDT"]);

export async function estimateUsdAmount({
  amount,
  currency,
}: {
  amount: number;
  currency: string;
}): Promise<UsdEstimate> {
  const normalizedCurrency = normalizeCurrency(currency);

  if (isBolivarCurrency(currency)) {
    return {
      error:
        "Para Venezuela, reporta el monto en USD o una aproximación en USD.",
    };
  }

  if (stableUsdCurrencies.has(normalizedCurrency)) {
    return {
      amount,
      conversionNotes: "Equivalente USD generado automáticamente.",
      exchangeRateDate: todayIsoDate(),
      exchangeRateSource: "Moneda USD o stablecoin.",
      exchangeRateUsed: 1,
    };
  }

  const configuredRate = parseConfiguredUsdRates()[normalizedCurrency];

  if (configuredRate) {
    return {
      amount: roundMoney(amount * configuredRate),
      conversionNotes: "Equivalente USD generado automáticamente.",
      exchangeRateDate: todayIsoDate(),
      exchangeRateSource: "USD_EXCHANGE_RATES_JSON",
      exchangeRateUsed: configuredRate,
    };
  }

  const apiRate = await fetchUsdRate(normalizedCurrency);

  if (apiRate) {
    return {
      amount: roundMoney(amount * apiRate.usdPerUnit),
      conversionNotes: "Equivalente USD generado automáticamente.",
      exchangeRateDate: apiRate.date,
      exchangeRateSource: apiRate.source,
      exchangeRateUsed: apiRate.usdPerUnit,
    };
  }

  return {
    error:
      "No pudimos generar el equivalente aproximado en USD para esa moneda.",
  };
}

export function normalizeCurrency(value: string) {
  return value.trim().toUpperCase().slice(0, 12);
}

export function isBolivarCurrency(value: string) {
  const normalized = value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return ["VES", "VEF", "VED", "BS", "BOLIVAR", "BOLIVARES"].includes(
    normalized,
  );
}

function parseConfiguredUsdRates() {
  const rawRates = process.env.USD_EXCHANGE_RATES_JSON;

  if (!rawRates) {
    return {} as Record<string, number>;
  }

  try {
    const parsed = JSON.parse(rawRates) as Record<string, unknown>;
    const rates: Record<string, number> = {};

    for (const [currency, rate] of Object.entries(parsed)) {
      const numericRate = typeof rate === "number" ? rate : Number(rate);

      if (Number.isFinite(numericRate) && numericRate > 0) {
        rates[normalizeCurrency(currency)] = numericRate;
      }
    }

    return rates;
  } catch {
    return {} as Record<string, number>;
  }
}

async function fetchUsdRate(currency: string) {
  const apiUrl = process.env.EXCHANGE_RATE_API_URL ?? defaultRateApiUrl;

  try {
    const response = await fetch(apiUrl, {
      next: { revalidate: 60 * 60 * 6 },
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      date?: string;
      rates?: Record<string, number>;
      result?: string;
      time_last_update_utc?: string;
    };
    const unitsPerUsd = data.rates?.[currency];

    if (!unitsPerUsd || unitsPerUsd <= 0) {
      return null;
    }

    return {
      date: data.date ?? todayIsoDate(),
      source: apiUrl,
      usdPerUnit: 1 / unitsPerUsd,
    };
  } catch {
    return null;
  }
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
