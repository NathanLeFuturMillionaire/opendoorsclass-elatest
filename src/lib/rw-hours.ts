export type RwWorkshopStatus = {
  open: boolean; now: string; next_open: string | null; closes_at: string | null; message: string | null;
  open_time: string; close_time: string; days: number[];
};

export const RW_WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/** "du lundi au samedi" for a contiguous range, otherwise a plain list. */
export function rwDaysLabel(days: number[]): string {
  const d = [...days].sort((a, b) => a - b);
  if (!d.length) return "aucun jour";
  const contiguous = d.every((v, i) => i === 0 || v === d[i - 1] + 1);
  if (contiguous && d.length > 2) return `du ${RW_WEEKDAYS[d[0] - 1].toLowerCase()} au ${RW_WEEKDAYS[d[d.length - 1] - 1].toLowerCase()}`;
  return d.map((x) => RW_WEEKDAYS[x - 1].toLowerCase()).join(", ");
}

/** Countdown text from server-time offset: "2 j 3 h 05 min", "3 h 05 min" or "12 min 08 s". */
export function rwCountdown(ms: number): string {
  if (ms <= 0) return "quelques instants";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d} j ${h} h ${p(m)} min`;
  if (h > 0) return `${h} h ${p(m)} min`;
  return `${m} min ${p(sec)} s`;
}

export function rwLibrevilleDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { timeZone: "Africa/Libreville", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}
