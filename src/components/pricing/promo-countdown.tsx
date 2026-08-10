import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import type { Countdown } from "@/hooks/use-pricing";

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-[58px] flex-col items-center rounded-xl bg-background/80 px-2 py-2 shadow-sm sm:min-w-[72px] sm:px-3">
      <span className="font-display text-xl font-extrabold tabular-nums sm:text-2xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[11px]">
        {label}
      </span>
    </div>
  );
}

export function PromoCountdown({
  remaining,
  isFr,
  className = "",
}: {
  remaining: Countdown;
  isFr: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`rounded-2xl border border-brand-green/40 bg-brand-green/10 p-4 ${className}`}
    >
      <p className="flex items-center gap-2 text-sm font-bold text-brand-green">
        <Flame className="size-4" aria-hidden />
        {isFr ? "Promotion limitée" : "Limited time offer"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {isFr ? "La promotion se termine dans :" : "The promotion ends in:"}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Unit value={remaining.days} label={isFr ? "Jours" : "Days"} />
        <Unit value={remaining.hours} label={isFr ? "Heures" : "Hours"} />
        <Unit value={remaining.minutes} label={isFr ? "Minutes" : "Minutes"} />
        <Unit value={remaining.seconds} label={isFr ? "Secondes" : "Seconds"} />
      </div>
    </motion.div>
  );
}