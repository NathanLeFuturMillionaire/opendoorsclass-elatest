import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPricingState } from "@/lib/pricing.functions";
import { formatConverted, formatXaf } from "@/lib/pricing";
import { ZERO_DECIMAL_CURRENCIES } from "@/lib/currency-map";

/**
 * Source unique du tarif côté client. Le prix est fixe et calculé par le serveur.
 */
export function usePricing(locale: "fr" | "en" = "fr") {
  const fetchPricing = useServerFn(getPricingState);
  const query = useQuery({
    queryKey: ["pricing-state"],
    queryFn: () => fetchPricing(),
    staleTime: 5 * 60 * 1000,
  });

  const state = query.data;
  const price = state?.price ?? null;

  const local = (amountXaf: number) => {
    if (!state || state.displayCurrency === "XAF" || state.rate === 1) return null;
    return formatConverted(
      amountXaf,
      state.rate,
      state.displayCurrency,
      locale,
      ZERO_DECIMAL_CURRENCIES.has(state.displayCurrency),
    );
  };

  return {
    loading: query.isLoading,
    state,
    price,
    credits: state?.credits ?? 1,
    formatXaf: (amount: number) => formatXaf(amount, locale),
    localPrice: local,
  };
}
