export const RW_SUBSCRIPTION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type RwSubscriptionStatus = "upcoming" | "active" | "expired";

export type RwSubscription = {
  startDate: string;
  endDate: string;
  durationDays: number;
  daysRemaining: number;
  daysUntilStart: number;
  percentRemaining: number;
  status: RwSubscriptionStatus;
};

function parseDate(value: string): number | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return time;
}

function toDateString(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

export function rwLibrevilleDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Libreville",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** A subscription ends at the start of the end date, exactly 30 calendar days after its start date. */
export function computeRwSubscription(
  startDate: string | null | undefined,
  today: string,
  durationDays = RW_SUBSCRIPTION_DAYS,
): RwSubscription | null {
  if (!startDate || !Number.isInteger(durationDays) || durationDays <= 0) return null;
  const start = parseDate(startDate);
  const current = parseDate(today);
  if (start === null || current === null) return null;
  const end = start + durationDays * DAY_MS;
  const daysUntilStart = Math.max(0, Math.round((start - current) / DAY_MS));
  const daysRemaining = Math.max(0, Math.min(durationDays, Math.round((end - current) / DAY_MS)));
  const status: RwSubscriptionStatus = current < start ? "upcoming" : daysRemaining === 0 ? "expired" : "active";
  return {
    startDate,
    endDate: toDateString(end),
    durationDays,
    daysRemaining,
    daysUntilStart,
    percentRemaining: Math.round((daysRemaining / durationDays) * 100),
    status,
  };
}
