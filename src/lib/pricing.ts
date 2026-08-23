// Source de vérité unique du tarif du test de niveau.
// Tarif fixe, sans promotion. La résolution est faite côté serveur.

export type PricingState = {
  /** Prix applicable, en XAF. */
  price: number;
  /** Horodatage serveur au moment de la réponse, ISO 8601 UTC. */
  serverNow: string;
  credits: number;
  currency: string;
  /** Pays détecté (ISO alpha-2) ou null. */
  country: string | null;
  /** Devise d'affichage locale. */
  displayCurrency: string;
  /** Taux 1 XAF => displayCurrency. */
  rate: number;
};

export type ResolvedOffer = {
  price: number;
  productId: string;
  credits: number;
  currency: string;
};

export function formatXaf(amount: number, locale: "fr" | "en" = "fr"): string {
  return `${new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US").format(amount)} FCFA`;
}

export function formatConverted(
  amountXaf: number,
  rate: number,
  currency: string,
  locale: "fr" | "en" = "fr",
  zeroDecimal = false,
): string {
  const value = amountXaf * rate;
  const rounded = zeroDecimal ? Math.round(value) : Math.round(value * 100) / 100;
  try {
    return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: zeroDecimal ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(rounded);
  } catch {
    return `${rounded} ${currency}`;
  }
}
