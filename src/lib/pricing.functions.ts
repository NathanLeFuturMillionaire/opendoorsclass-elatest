import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import type { PricingState } from "@/lib/pricing";

export const getPricingState = createServerFn({ method: "GET" }).handler(
  async (): Promise<PricingState> => {
    const { resolveCurrentOffer, getXafRates } = await import("@/lib/pricing.server");
    const { currencyForCountry } = await import("@/lib/currency-map");

    const { row, promoActive, price, credits, currency } = await resolveCurrentOffer();

    const country =
      getRequestHeader("cf-ipcountry") ??
      getRequestHeader("x-vercel-ip-country") ??
      getRequestHeader("x-country-code") ??
      null;
    const normalized = country && country.length === 2 ? country.toUpperCase() : null;

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