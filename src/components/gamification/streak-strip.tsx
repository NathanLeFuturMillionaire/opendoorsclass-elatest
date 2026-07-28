import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const DAYS_FR = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];
const DAYS_EN = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export function StreakStrip({
  current,
  longest,
  lastActivity,
}: {
  current: number;
  longest: number;
  lastActivity: string | null;
}) {
  const { locale } = useI18n();
  const labels = locale === "fr" ? DAYS_FR : DAYS_EN;
  // Monday-based week
  const today = new Date();
  const todayIdx = (today.getDay() + 6) % 7; // 0=Mon
  const last = lastActivity ? new Date(lastActivity + "T00:00:00Z") : null;
  const daysAgoLast =
    last != null
      ? Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - last.getTime()) / 86400000)
      : Infinity;
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="size-5 text-orange-500" aria-hidden />
          <p className="text-sm font-semibold">
            {locale === "fr" ? "Série d'activité" : "Learning Streak"}
          </p>
        </div>
        <p className="text-sm font-bold text-foreground">
          {current} {locale === "fr" ? (current > 1 ? "jours" : "jour") : current > 1 ? "days" : "day"}
        </p>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {labels.map((d, i) => {
          const distance = todayIdx - i;
          const active = distance >= 0 && distance < current && distance >= daysAgoLast - (current - 1);
          const isToday = i === todayIdx;
          return (
            <div key={d} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{d}</span>
              <div
                className={cn(
                  "grid size-8 place-items-center rounded-full border text-[10px]",
                  active
                    ? "border-orange-400/40 bg-orange-500/15 text-orange-600 dark:text-orange-300"
                    : "border-border bg-muted/40 text-muted-foreground",
                  isToday && "ring-2 ring-primary/50",
                )}
                aria-label={active ? "actif" : "inactif"}
              >
                {active ? "🔥" : ""}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {locale === "fr" ? "Meilleure série" : "Longest streak"}: <span className="font-semibold text-foreground">{longest}</span>
      </p>
    </div>
  );
}