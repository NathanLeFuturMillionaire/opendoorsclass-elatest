import { useState } from "react";
import { Lock, Trophy } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { Badge } from "@/lib/gamification.functions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function IconFor({ name, className }: { name: string; className?: string }) {
  const Cmp = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ?? Trophy;
  return <Cmp className={className} />;
}

export function BadgeGrid({ badges, compact = false }: { badges: Badge[]; compact?: boolean }) {
  const { locale } = useI18n();
  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4")}>
      {badges.map((b) => (
        <BadgeCard key={b.code} b={b} locale={locale} compact={compact} />
      ))}
    </div>
  );
}

function BadgeCard({ b, locale, compact }: { b: Badge; locale: "fr" | "en"; compact: boolean }) {
  const unlocked = !!b.unlocked_at;
  const name = locale === "fr" ? b.name_fr : b.name_en;
  const desc = locale === "fr" ? b.description_fr : b.description_en;
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-all",
            unlocked
              ? "border-amber-400/30 bg-gradient-to-b from-amber-500/10 to-transparent hover:scale-[1.03]"
              : "border-border bg-muted/30 opacity-70 hover:opacity-100",
          )}
          aria-label={name}
        >
          <div
            className={cn(
              "relative grid size-12 place-items-center rounded-full",
              unlocked
                ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md"
                : "bg-muted text-muted-foreground",
            )}
          >
            <IconFor name={b.icon} className="size-5" />
            {!unlocked && (
              <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border border-border bg-background">
                <Lock className="size-3 text-muted-foreground" aria-hidden />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className={cn("truncate text-xs font-semibold", !compact && "text-sm")}>{name}</p>
            {!compact && (
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">+{b.xp_reward} XP</p>
            )}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 text-sm" align="center">
        <p className="font-semibold">{name}</p>
        <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-amber-600">
          {unlocked
            ? locale === "fr"
              ? "Débloqué"
              : "Unlocked"
            : locale === "fr"
              ? "Verrouillé"
              : "Locked"}{" "}
          · +{b.xp_reward} XP
        </p>
      </PopoverContent>
    </Popover>
  );
}