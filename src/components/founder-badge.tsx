import { Crown, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { FOUNDER_ROLE_KEY, getPublicRole, type PublicRole } from "@/lib/founders";

type Props = {
  userId?: string | null;
  candidateNumber?: string | null;
  role?: PublicRole | null;
  className?: string;
  size?: "sm" | "md";
};

/**
 * Badge public Founder / Co-Founder. N'affiche rien pour les autres membres.
 */
export function FounderBadge({ userId, candidateNumber, role, className, size = "sm" }: Props) {
  const t = useT();
  const resolved = role ?? getPublicRole({ userId, candidateNumber });
  if (!resolved) return null;
  const label = t(FOUNDER_ROLE_KEY[resolved] as never);
  const Icon = resolved === "founder" ? Crown : Gem;
  return (
    <span
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border font-semibold leading-none",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        resolved === "founder"
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "border-brand-green/40 bg-brand-green/10 text-brand-green",
        className,
      )}
    >
      <Icon className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden />
      {label}
    </span>
  );
}
