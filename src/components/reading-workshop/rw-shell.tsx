import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import { BookOpen, GraduationCap, LayoutDashboard, Library, Loader2, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { getRwContext } from "@/lib/reading-workshop.functions";

type Need = "admin" | "coach" | "learner" | "member";

export function useRwContext() {
  const fetchCtx = useServerFn(getRwContext);
  return useQuery({ queryKey: ["rw-context"], queryFn: () => fetchCtx() });
}

/** Protected Reading Workshop page shell: checks the space permission before showing content. */
export function RwShell({ need, title, subtitle, children }: { need: Need; title: string; subtitle?: string; children: ReactNode }) {
  const { data, isLoading, error } = useRwContext();
  const allowed =
    !!data &&
    (data.isStaff ||
      (need === "coach" && data.isCoach) ||
      (need === "learner" && data.isLearner) ||
      (need === "member" && (data.isCoach || data.isLearner)));

  return (
    <div className="rw-theme min-h-screen bg-background">
      <SiteHeader />
      <div className="border-b border-border bg-[var(--rw-soft)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 text-sm sm:px-6">
          <Link to="/reading-workshop" className="mr-2 flex items-center gap-2 font-semibold text-primary">
            <BookOpen className="size-4" aria-hidden /> Reading Workshop
          </Link>
          {data?.isStaff && <RwTab to="/reading-workshop/admin" icon={<ShieldCheck className="size-4" />} label="Administration" />}
          {(data?.isStaff || data?.isCoach) && <RwTab to="/reading-workshop/coach" icon={<LayoutDashboard className="size-4" />} label="Espace coach" />}
          {(data?.isStaff || data?.isLearner) && <RwTab to="/reading-workshop/learner" icon={<GraduationCap className="size-4" />} label="Mon espace" />}
          {data && (data.isStaff || data.isCoach || data.isLearner) && <RwTab to="/reading-workshop/library" icon={<Library className="size-4" />} label="Bibliothèque" />}
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-primary" aria-label="Chargement" /></div>
        ) : error ? (
          <p className="rounded-2xl border border-destructive/40 p-6 text-destructive">Impossible de charger votre espace. Réessayez dans un instant.</p>
        ) : !allowed ? (
          <div className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold">Accès réservé</h1>
            <p className="mt-2 text-muted-foreground">
              Cet espace est réservé aux participants du Reading Workshop. Si vous êtes inscrit, contactez OpenDoorsClass pour activer votre accès.
            </p>
            <Button asChild className="mt-6"><Link to="/reading-workshop">Retour au Reading Workshop</Link></Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </>
        )}
      </main>
    </div>
  );
}

function RwTab({ to, icon, label }: { to: "/reading-workshop/admin" | "/reading-workshop/coach" | "/reading-workshop/learner" | "/reading-workshop/library"; icon: ReactNode; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-muted-foreground hover:bg-background hover:text-foreground" activeProps={{ className: "bg-background text-foreground shadow-sm" }}>
      {icon} {label}
    </Link>
  );
}

export function RwStat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-primary">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function RwEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
