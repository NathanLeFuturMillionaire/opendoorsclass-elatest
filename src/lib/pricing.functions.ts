import { createServerFn } from "@tanstack/react-start";
import type { PricingState } from "@/lib/pricing";

export const getPricingState = createServerFn({ method: "GET" }).handler(
  async (): Promise<PricingState> => {
    const { resolveCurrentOffer, getXafRates } = await import("@/lib/pricing.server");
    const { currencyForCountry } = await import("@/lib/currency-map");
    const { detectCountryFromRequest } = await import("@/lib/geo.server");

    const { row, promoActive, price, credits, currency } = await resolveCurrentOffer();

    const normalized = detectCountryFromRequest();

    const displayCurrency = currencyForCountry(normalized);
    const rates = await getXafRates();
    const rate = displayCurrency === "XAF" ? 1 : (rates[displayCurrency] ?? 0);

    return {
      promoActive,
      price,
      promoPrice: row.promo_price,
      normalPrice: row.normal_price,
      startsAt: new Date(row.starts_at).toISOString(),
      endsAt: new Date(row.ends_at).toISOString(),
      serverNow: new Date().toISOString(),
      credits,
      currency,
      country: normalized,
      displayCurrency: rate > 0 ? displayCurrency : "XAF",
      rate: rate > 0 ? rate : 1,
    };
  },
);