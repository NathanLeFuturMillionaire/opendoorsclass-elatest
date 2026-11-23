import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpenCheck, CheckCircle2, ClipboardCheck, Globe2, Send, Star, UserCheck, Users } from "lucide-react";
import type { ReactNode } from "react";
import { getPublicStats } from "@/lib/public-stats.functions";
import { countryFlag, countryName, type PublicStats } from "@/lib/public-stats";
import { AnimatedCounter } from "./animated-counter";
import { Reveal } from "./reveal";

function usePublicStats() {
  const fetchStats = useServerFn(getPublicStats);
  return useQuery({ queryKey: ["public-stats"], queryFn: () => fetchStats(), staleTime: 5 * 60 * 1000, refetchInterval: 10 * 60 * 1000 });
}

function StatCard({ icon, value, decimals, suffix, label, hint, delay }: { icon: ReactNode; value: number | null | undefined; decimals?: number; suffix?: string; label: string; hint: string; delay: number }) {
  return (
    <Reveal delay={delay}>
      <div className="group h-full rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-green/50 hover:shadow-lg">
        <div className="grid size-11 place-items-center rounded-xl bg-brand-green-soft text-brand-green transition-transform group-hover:scale-110">{icon}</div>
        <p className="mt-5 text-4xl font-extrabold tracking-tight">
          {value === undefined ? <span className="inline-block h-9 w-20 animate-pulse rounded bg-muted" /> : value === null ? <span className="text-xl text-muted-foreground">En cours de constitution</span> : <AnimatedCounter value={value} decimals={decimals ?? 0} suffix={suffix ?? ""} />}
        </p>
        <p className="mt-2 font-semibold">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      </div>
    </Reveal>
  );
}

function Unavailable() {
  return <p className="mt-6 rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Les statistiques sont momentanément indisponibles. Réessayez dans quelques instants.</p>;
}

export function PlatformStatsSection() {
  const { data, isError } = usePublicStats();
  const d: Partial<PublicStats> = data ?? {};
  return (
    <section id="chiffres" className="border-y border-border bg-secondary/40 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">En quelques chiffres</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">OpenDoorsClass, une activité réelle</h2>
          <p className="mt-3 text-muted-foreground">Chiffres calculés directement à partir de notre base de données, actualisés automatiquement.</p>
        </Reveal>
        {isError ? <Unavailable /> : (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard delay={0} icon={<Users className="size-5" />} value={d.registered} label="Comptes inscrits" hint="Un compte utilisateur unique par personne inscrite." />
            <StatCard delay={0.08} icon={<Globe2 className="size-5" />} value={data ? data.countries.length : undefined} label="Pays représentés" hint="Pays renseignés par nos membres sur leur compte." />
            <StatCard delay={0.16} icon={<ClipboardCheck className="size-5" />} value={d.completedTests} label="Tests de niveau terminés" hint="Uniquement les tentatives terminées et enregistrées." />
            <StatCard delay={0.24} icon={<UserCheck className="size-5" />} value={d.serviceUsers} label="Personnes ayant utilisé un service" hint="Test terminé ou activité réelle dans le Reading Workshop, sans double comptage." />
          </div>
        )}
      </div>
    </section>
  );
}

export function WorldSection() {
  const { data } = usePublicStats();
  const top = data?.countries.slice(0, 12) ?? [];
  const max = top[0]?.count ?? 1;
  return (
    <section className="py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:items-center">
        <Reveal>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">Présence internationale</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">OpenDoorsClass à travers le monde</h2>
          <p className="mt-4 text-muted-foreground">Nés au Gabon, nos services accueillent des apprenants de plusieurs pays. Seuls les pays renseignés par nos membres sont pris en compte, sans aucune localisation personnelle.</p>
          {data ? <p className="mt-4 text-sm text-muted-foreground">{data.countriesKnownAccounts.toLocaleString("fr-FR")} comptes sur {data.registered.toLocaleString("fr-FR")} ont indiqué leur pays.</p> : null}
        </Reveal>
        <div className="grid gap-3 sm:grid-cols-2">
          {!data ? Array.from({ length: 6 }).map((_, n) => <div key={n} className="h-16 animate-pulse rounded-xl bg-muted" />) :
            top.length === 0 ? <p className="text-sm text-muted-foreground">Données en cours de constitution.</p> :
            top.map((c, n) => (
              <Reveal key={c.code} delay={n * 0.04}>
                <div className="rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-brand-green/50">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden>{countryFlag(c.code)}</span>
                    <span className="flex-1 truncate text-sm font-semibold">{countryName(c.code)}</span>
                    <span className="text-sm font-bold tabular-nums text-brand-green">{c.count}</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-brand-green" style={{ width: `${Math.max(6, (c.count / max) * 100)}%` }} />
                  </div>
                </div>
              </Reveal>
            ))}
        </div>
      </div>
    </section>
  );
}

export function ReadingStatsSection() {
  const { data, isError } = usePublicStats();
  const rw = data?.rw;
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-foreground p-8 text-background sm:p-12">
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-brand-green/30 blur-3xl" />
          <Reveal className="relative max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">Reading Workshop</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Une communauté de lecteurs qui progresse.</h2>
            <p className="mt-3 text-background/70">Indicateurs globaux, sans aucune performance individuelle.</p>
          </Reveal>
          {isError ? <Unavailable /> : (
            <div className="relative mt-10 grid gap-4 text-foreground sm:grid-cols-2 lg:grid-cols-4">
              <StatCard delay={0} icon={<BookOpenCheck className="size-5" />} value={rw?.readersStarted} label="Lecteurs actifs" hint="Apprenants uniques ayant répondu à une question ou envoyé une lecture." />
              <StatCard delay={0.08} icon={<Send className="size-5" />} value={rw?.submissions} label="Lectures envoyées" hint="Soumissions réellement enregistrées, chacune comptée une fois." />
              <StatCard delay={0.16} icon={<Star className="size-5" />} value={rw ? rw.averageScore : undefined} decimals={1} suffix=" / 20" label="Moyenne des lectures corrigées" hint={rw ? `Calculée sur ${rw.gradedCount} lectures notées par un coach.` : "Lectures notées par un coach uniquement."} />
              <StatCard delay={0.24} icon={<CheckCircle2 className="size-5" />} value={rw?.finishedReadings} label="Lectures validées" hint="Textes validés par un coach, un par apprenant et par texte." />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
