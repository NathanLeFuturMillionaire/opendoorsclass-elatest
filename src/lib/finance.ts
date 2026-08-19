/**
 * Commission retenue par Chariow sur chaque vente.
 * Source de vérité unique : tout montant net affiché doit passer par ces helpers.
 */
export const CHARIOW_COMMISSION_RATE = 0.15;

/** Commission retenue sur un montant brut. */
export function chariowCommission(gross: number): number {
  return Math.round((Number(gross) || 0) * CHARIOW_COMMISSION_RATE);
}

/** Revenu net encaissé après commission Chariow. */
export function netRevenue(gross: number): number {
  const g = Number(gross) || 0;
  return g - chariowCommission(g);
}
