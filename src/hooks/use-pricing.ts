import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPricingState } from "@/lib/pricing.functions";
import { formatConverted, formatXaf } from "@/lib/pricing";
import { ZERO_DECIMAL_CURRENCIES } from "@/lib/currency-map";

export type Countdown = { days: number; hours: number; minutes: number; seconds: number; done: boolean };

function breakdown(ms: number): Countdown {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: false,
  };
}

/**
 * Source unique du tarif côté client. L'état est calculé par le serveur.
 * Le compte à rebours est purement local (aucune requête chaque seconde),
 * avec une correction de dérive basée sur l'horloge serveur.
 */
export function usePricing(locale: "fr" | "en" = "fr") {
  const fetchPricing = useServerFn(getPricingState);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["pricing-state"],
    queryFn: () => fetchPricing(),
    staleTime: 5 * 60 * 1000,
  });

  const state = query.data;
  const skew = useMemo(
    () => (state ? Date.parse(state.serverNow) - Date.now() : 0),
    [state],
  );

  const [remaining, setRemaining] = useState<Countdown>({
    days: 0, hours: 0, minutes: 0, seconds: 0, done: true,
  });

  useEffect(() => {
    if (!state) return;
    const end = Date.parse(state.endsAt);
    const tick = () => {
      const ms = end - (Date.now() + skew);
      const next = breakdown(ms);
      setRemaining(next);
      if (next.done && state.promoActive) {
        // La promotion vient d'expirer: on redemande l'état au serveur.
        void queryClient.invalidateQueries({ queryKey: ["pricing-state"] });
        void queryClient.invalidateQueries({ queryKey: ["test-offers"] });
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [state, skew, queryClient]);

  const promoActive = Boolean(state?.promoActive) && !remaining.done;
  const price = state ? (promoActive ? state.promoPrice : state.normalPrice) : null;

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
    promoActive,
    remaining,
    price,
    normalPrice: state?.normalPrice ?? null,
    promoPrice: state?.promoPrice ?? null,
    credits: state?.credits ?? 1,
    formatXaf: (amount: number) => formatXaf(amount, locale),
    localPrice: local,
  };
}