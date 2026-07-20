// Simple adaptive-price display. Base currency stays XAF (Chariow charges in XAF).
// The buyer country is inferred from the browser locale/timezone as a display hint.

export type LocalPrice = {
  base: number;          // amount in XAF
  baseCurrency: "XAF";
  region: string;        // ISO country code (best-effort)
  currency: string;      // display currency
  amount: number;        // amount converted to display currency (rounded)
  formatted: string;     // "≈ $17 USD" or "10 000 FCFA"
};

// Static reference rates: 1 XAF = X currency. Tuned for informational display.
const RATES: Record<string, number> = {
  XAF: 1,
  XOF: 1,
  EUR: 0.00152,
  USD: 0.00165,
  GBP: 0.0013,
  CAD: 0.00225,
  CHF: 0.00146,
  MAD: 0.0165,
  DZD: 0.221,
  TND: 0.0052,
  NGN: 2.75,
  GHS: 0.026,
  ZAR: 0.031,
  KES: 0.213,
  AED: 0.006,
  SAR: 0.0062,
  INR: 0.145,
  CNY: 0.012,
  JPY: 0.257,
  BRL: 0.0092,
  AUD: 0.0026,
};

// Countries that natively use the CFA franc: keep native XAF display.
const CFA_COUNTRIES = new Set([
  "GA", "CM", "CG", "CD", "TD", "CF", "GQ",
  "SN", "CI", "ML", "BF", "BJ", "TG", "NE", "GW",
]);

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  FR: "EUR", BE: "EUR", CH: "CHF", LU: "EUR", MC: "EUR",
  DE: "EUR", ES: "EUR", IT: "EUR", PT: "EUR", NL: "EUR", IE: "EUR",
  AT: "EUR", GR: "EUR", FI: "EUR", SE: "EUR",
  GB: "GBP",
  US: "USD", CA: "CAD",
  MA: "MAD", DZ: "DZD", TN: "TND",
  NG: "NGN", GH: "GHS", ZA: "ZAR", KE: "KES",
  AE: "AED", SA: "SAR",
  IN: "INR", CN: "CNY", JP: "JPY", KR: "USD",
  BR: "BRL", AR: "USD",
  AU: "AUD", NZ: "AUD",
};

// Timezone → country fallback (partial, best-effort).
const TZ_TO_COUNTRY: Record<string, string> = {
  "Africa/Libreville": "GA",
  "Africa/Douala": "CM",
  "Africa/Brazzaville": "CG",
  "Africa/Kinshasa": "CD",
  "Africa/Lagos": "NG",
  "Africa/Abidjan": "CI",
  "Africa/Dakar": "SN",
  "Africa/Casablanca": "MA",
  "Africa/Algiers": "DZ",
  "Africa/Tunis": "TN",
  "Africa/Johannesburg": "ZA",
  "Africa/Nairobi": "KE",
  "Africa/Accra": "GH",
  "Europe/Paris": "FR",
  "Europe/Brussels": "BE",
  "Europe/Zurich": "CH",
  "Europe/London": "GB",
  "Europe/Madrid": "ES",
  "Europe/Berlin": "DE",
  "Europe/Rome": "IT",
  "America/New_York": "US",
  "America/Los_Angeles": "US",
  "America/Chicago": "US",
  "America/Toronto": "CA",
  "America/Montreal": "CA",
  "America/Sao_Paulo": "BR",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Asia/Kolkata": "IN",
  "Asia/Shanghai": "CN",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Australia/Sydney": "AU",
};

export function detectRegion(): string {
  if (typeof window === "undefined") return "GA";
  try {
    const stored = localStorage.getItem("odc.region");
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  try {
    const lang = navigator.language || "";
    const m = lang.match(/[_-]([A-Za-z]{2})$/);
    if (m) return m[1].toUpperCase();
  } catch {
    /* ignore */
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TZ_TO_COUNTRY[tz]) return TZ_TO_COUNTRY[tz];
  } catch {
    /* ignore */
  }
  return "GA";
}

function formatXaf(amount: number, locale: string) {
  return `${new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US").format(amount)} FCFA`;
}

function formatConverted(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" || currency === "NGN" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function computeLocalPrice(
  baseXaf: number,
  locale: "fr" | "en" = "fr",
  region?: string,
): LocalPrice {
  const r = (region ?? detectRegion()).toUpperCase();
  const useXaf = CFA_COUNTRIES.has(r) || !COUNTRY_TO_CURRENCY[r];
  const currency = useXaf ? "XAF" : COUNTRY_TO_CURRENCY[r];
  const rate = RATES[currency] ?? 1;
  const converted = baseXaf * rate;
  const rounded =
    currency === "JPY" || currency === "NGN" || currency === "XAF" || currency === "XOF"
      ? Math.round(converted)
      : Math.round(converted * 100) / 100;
  const nativeXaf = formatXaf(baseXaf, locale);
  const formatted = useXaf
    ? nativeXaf
    : `${nativeXaf} · ≈ ${formatConverted(rounded, currency, locale)}`;
  return {
    base: baseXaf,
    baseCurrency: "XAF",
    region: r,
    currency,
    amount: rounded,
    formatted,
  };
}
