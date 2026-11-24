import { CalendarCheck2, CalendarDays, Clock3 } from "lucide-react";
import type { RwSubscription } from "@/lib/rw-subscription";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00.000Z`));
}

function SubscriptionRing({ subscription }: { subscription: RwSubscription }) {
  const size = 164;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const { daysRemaining, durationDays, percentRemaining } = subscription;
  return (
    <div
      className="relative mx-auto flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${daysRemaining} jour${daysRemaining > 1 ? "s" : ""} restant${daysRemaining > 1 ? "s" : ""} sur ${durationDays}`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--rw-soft)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percentRemaining / 100)}
          className="transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={cn("font-display font-extrabold leading-none tracking-tight text-primary", daysRemaining >= 100 ? "text-4xl" : "text-5xl")}>
          {daysRemaining}
        </span>
        <span className="mt-2 max-w-24 text-xs font-bold leading-tight text-muted-foreground">
          jour{daysRemaining > 1 ? "s" : ""} restant{daysRemaining > 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

export function RwSubscriptionCard({ subscription }: { subscription: RwSubscription | null }) {
  if (!subscription) return null;
  const { status, daysRemaining, daysUntilStart, startDate, endDate, durationDays } = subscription;
  const title = status === "expired"
    ? "Votre abonnement est terminé"
    : status === "upcoming"
      ? "Votre abonnement commence bientôt"
      : daysRemaining === 1
        ? "Dernier jour pour profiter de votre abonnement"
        : "Votre temps pour progresser";
  const description = status === "expired"
    ? `La période de ${durationDays} jours s'est terminée le ${formatDate(endDate)}.`
    : status === "upcoming"
      ? `Votre période de ${durationDays} jours commence dans ${daysUntilStart} jour${daysUntilStart > 1 ? "s" : ""}.`
      : `Il vous reste ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""} pour avancer avec votre coach.`;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--rw-shadow)]" aria-labelledby="rw-subscription-title">
      <div aria-hidden className="absolute -right-16 -top-24 size-64 rounded-full border-[36px] border-primary/5" />
      <div aria-hidden className="absolute -bottom-16 left-1/3 size-36 rounded-full bg-[var(--rw-soft)]" />
      <div className="relative grid gap-6 p-5 sm:p-7 md:grid-cols-[164px_minmax(0,1fr)] md:items-center md:gap-8">
        <SubscriptionRing subscription={subscription} />
        <div className="min-w-0 text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--rw-soft)] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">
            <Clock3 className="size-3.5" aria-hidden />
            {status === "expired" ? "Abonnement expiré" : status === "upcoming" ? "Abonnement à venir" : "Abonnement actif"}
          </div>
          <h2 id="rw-subscription-title" className="mt-3 text-xl font-extrabold sm:text-2xl">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          <div className="mt-5 grid gap-3 text-left sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 p-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--rw-soft)] text-primary">
                <CalendarDays className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Début</p>
                <p className="mt-0.5 text-sm font-bold">{formatDate(startDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 p-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--rw-soft)] text-primary">
                <CalendarCheck2 className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Fin</p>
                <p className="mt-0.5 text-sm font-bold">{formatDate(endDate)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
