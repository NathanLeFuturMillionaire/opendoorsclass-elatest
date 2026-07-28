import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { levelInfo } from "@/lib/gamification.functions";
import { XpBadge } from "./xp-badge";
import { useI18n } from "@/lib/i18n";

export function LevelProgressCard({ xp }: { xp: number }) {
  const info = levelInfo(xp);
  const { locale } = useI18n();
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(info.percent), 60);
    return () => clearTimeout(t);
  }, [info.percent]);

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-brand-gradient text-primary-foreground shadow-sm">
            <Trophy className="size-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              OpenDoors Level
            </p>
            <p className="text-lg font-bold">
              Level {info.level} <span className="text-muted-foreground font-medium">— {info.name}</span>
            </p>
          </div>
        </div>
        <XpBadge xp={xp} />
      </div>
      <div className="mt-5">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand-gradient transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${w}%` }}
            role="progressbar"
            aria-valuenow={info.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {xp.toLocaleString()} {info.nextThreshold ? `/ ${info.nextThreshold.toLocaleString()}` : ""} XP
          </span>
          <span>
            {info.nextThreshold
              ? locale === "fr"
                ? `${info.xpToNext.toLocaleString()} XP avant le niveau ${info.level + 1}`
                : `${info.xpToNext.toLocaleString()} XP to Level ${info.level + 1}`
              : locale === "fr"
                ? "Niveau maximum atteint"
                : "Max level reached"}
          </span>
        </div>
      </div>
    </div>
  );
}