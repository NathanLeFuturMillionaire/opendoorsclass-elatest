import { Sparkles } from "lucide-react";
import type { XpTransaction } from "@/lib/gamification.functions";
import { useI18n } from "@/lib/i18n";

export function XpActivityList({ transactions }: { transactions: XpTransaction[] }) {
  const { locale } = useI18n();
  if (!transactions.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
        {locale === "fr" ? "Pas encore d'activité XP." : "No XP activity yet."}
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {transactions.map((t, i) => (
        <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-amber-500/10 text-amber-600">
              <Sparkles className="size-4" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-medium">{t.reason}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {new Date(t.created_at).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <span className="text-sm font-bold text-amber-600">+{t.amount} XP</span>
        </li>
      ))}
    </ul>
  );
}