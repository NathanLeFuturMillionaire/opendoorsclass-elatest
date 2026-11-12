import { Award, Lightbulb, Lock } from "lucide-react";
import type { RwProgress } from "@/lib/rw-progress";
import { RW_TOTAL_SESSIONS } from "@/lib/rw-progress";
import { cn } from "@/lib/utils";

export function RwProgressRing({ percent, size = 120, label }: { percent: number; size?: number; label?: string }) {
  const p = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const stroke = Math.max(6, size / 12);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`Progression ${p}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--rw-soft)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--primary)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} style={{ transition: "stroke-dashoffset .8s ease" }} />
      </svg>
      <span className="absolute text-center">
        <span className={cn("block font-extrabold text-primary", size >= 100 ? "text-2xl" : "text-sm")}>{p}%</span>
        {label && size >= 100 && <span className="block text-[11px] text-muted-foreground">{label}</span>}
      </span>
    </div>
  );
}

export function RwProgressPanel({ p }: { p: RwProgress }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[auto,1fr]">
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card p-6 shadow-[var(--rw-shadow)]">
        <RwProgressRing percent={p.percent} size={150} label="du programme" />
        <p className="text-sm text-muted-foreground">{p.validated} / {RW_TOTAL_SESSIONS} lectures validées</p>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Semaine", `${p.currentWeek} / 20`], ["Moyenne", p.averageScore === null ? "Pas de note" : `${p.averageScore} / 20`], ["En attente", p.pending], ["Reprises", p.redo]].map(([k, v]) => (
            <div key={k as string} className="rounded-2xl border border-border/70 bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{k}</p>
              <p className="mt-1 text-xl font-extrabold text-primary">{v}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-[var(--rw-soft)] p-4">
          <p className="mb-2 flex items-center gap-2 font-bold"><Lightbulb className="size-4 text-primary" /> Conseils</p>
          <ul className="space-y-1 text-sm">{p.recommendations.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
        <div>
          <p className="mb-2 font-bold">Badges</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {p.badges.map((b) => (
              <div key={b.id} className={cn("flex items-center gap-2 rounded-xl border p-3", b.earned ? "border-primary/40 bg-card" : "border-dashed border-border opacity-60")}>
                {b.earned ? <Award className="size-5 shrink-0 text-primary" /> : <Lock className="size-5 shrink-0 text-muted-foreground" />}
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{b.label}</p><p className="truncate text-xs text-muted-foreground">{b.hint}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
