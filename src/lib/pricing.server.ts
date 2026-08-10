import type { PromotionRow, ResolvedOffer } from "@/lib/pricing";
import { resolveOffer } from "@/lib/pricing";

const FALLBACK: PromotionRow = {
  is_enabled: false,
  promo_price: 3500,
  promo_product_id: "prd_inqj69el",
  normal_price: 12000,
  normal_product_id: "prd_00p1bi7x",
  currency: "XAF",
  credits_included: 1,
  starts_at: new Date(0).toISOString(),
  ends_at: new Date(0).toISOString(),
};

let rowCache: { row: PromotionRow; at: number } | null = null;
const ROW_TTL = 60_000;

export async function loadPromotionRow(): Promise<PromotionRow> {
  const now = Date.now();
  if (rowCache && now - rowCache.at < ROW_TTL) return rowCache.row;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("pricing_promotion")
    .select(
      "is_enabled, promo_price, promo_product_id, normal_price, normal_product_id, currency, credits_included, starts_at, ends_at",
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = (data as PromotionRow | null) ?? FALLBACK;
  rowCache = { row, at: now };
  return row;
}

/** Tarif applicable, calculé exclusivement à partir de l'horloge serveur. */
export async function resolveCurrentOffer(): Promise<ResolvedOffer & { row: PromotionRow }> {
  const row = await loadPromotionRow();
  return { ...resolveOffer(row, Date.now()), row };
}

// --- Taux de change, mis en cache pour éviter les appels répétés ---
let ratesCache: { rates: Record<string, number>; at: number } | null = null;
const RATES_TTL = 6 * 60 * 60 * 1000;

export async function getXafRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (ratesCache && now - ratesCache.at < RATES_TTL) return ratesCache.rates;
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/XAF");
    if (!res.ok) throw new Error(`rates ${res.status}`);
    const body = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (body.result !== "success" || !body.rates) throw new Error("rates unavailable");
    ratesCache = { rates: body.rates, at: now };
    return body.rates;
  } catch {
    if (ratesCache) return ratesCache.rates;
    return { XAF: 1, XOF: 1 };
  }
}