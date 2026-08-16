import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

const MINUTE = 60_000;

/** Formatte un ecart de temps de facon relative et localisee. */
export function formatRelative(iso: string | null | undefined, locale: string): string {
  if (!iso) return "-";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "-";
  const diff = Date.now() - then;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const sec = Math.round(diff / 1000);
  if (sec < 60) return rtf.format(-sec, "second");
  const min = Math.round(sec / 60);
  if (min < 60) return rtf.format(-min, "minute");
  const hours = Math.round(min / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 7) return rtf.format(-days, "day");
  const weeks = Math.round(days / 7);
  if (days < 30) return rtf.format(-weeks, "week");
  const months = Math.round(days / 30);
  if (days < 365) return rtf.format(-months, "month");
  return rtf.format(-Math.round(days / 365), "year");
}

/**
 * Affiche un temps relatif qui se met a jour toute seule (une minute),
 * sans requete serveur supplementaire.
 */
export function RelativeTime({ value, className }: { value: string | null | undefined; className?: string }) {
  const { locale } = useI18n();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), MINUTE);
    return () => clearInterval(id);
  }, []);

  if (!value) return <span className={className}>-</span>;
  const abs = new Date(value);
  return (
    <time dateTime={value} title={abs.toLocaleString(locale)} className={className}>
      {formatRelative(value, locale)}
    </time>
  );
}
