import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function XpBadge({ xp, className }: { xp: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-300",
        className,
      )}
    >
      <Sparkles className="size-3.5" aria-hidden />
      {xp.toLocaleString()} XP
    </span>
  );
}