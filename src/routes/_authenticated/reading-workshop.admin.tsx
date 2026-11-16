import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link2, Pencil, Plus, RotateCcw, Search, UserMinus } from "lucide-react";
import { RwRemovalLog, RwRemoveDialog, type RwRemoveTarget } from "@/components/reading-workshop/rw-remove-dialog";
import { RwAvatar, RwEmpty, RwShell, RwStat } from "@/components/reading-workshop/rw-shell";
import { RwPersonDialog, type RwPerson } from "@/components/reading-workshop/rw-person-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createRwAccessLink, getRwAdminOverview, listRwPeople } from "@/lib/reading-workshop.functions";
import { RW_PROGRAM } from "@/lib/reading-workshop";
import { RwLessonPath } from "@/components/reading-workshop/rw-lesson-path";
import { RwHoursAdmin } from "@/components/reading-workshop/rw-hours-admin";
import { RwProgressTable } from "@/components/reading-workshop/rw-progress-table";
import { useRwSubmissions } from "@/components/reading-workshop/rw-submissions-list";

export const Route = createFileRoute("/_authenticated/reading-workshop/admin")({
  head: () => ({ meta: [{ title: "Administration, Reading Workshop OpenDoorsClass" }] }),
  component: () => (
    <RwShell need="admin" title="Administration" subtitle="Créez les apprenants et les coachs, ajoutez leur photo, fixez le niveau et envoyez leur lien d'accès.">
      <AdminHome />
    </RwShell>
  ),
});

function AdminHome() {
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getRwAdminOverview);
  const fetchPeople = useServerFn(listRwPeople);
  const makeLink = useServerFn(createRwAccessLink);
  const { data: ov } = useQuery({ queryKey: ["rw-admin-overview"], queryFn: () => fetchOverview() });
  const { data: people } = useQuery({ queryKey: ["rw-people"], queryFn: () => fetchPeople() });
  const [dialog, setDialog] = useState<{ kind: "learner" | "coach"; person: RwPerson | null } | null>(null);
  const [q, setQ] = useState("");
  const [unlockFor, setUnlockFor] = useState("");
  const { data: subs = [] } = useRwSubmissions("admin");
  const [linking, setLinking] = useState<string | null>(null);
  const [removing, setRemoving] = useState<RwRemoveTarget | null>(null);

  const coaches = people?.coaches ?? [];
  const coachName = useMemo(() => Object.fromEntries(coaches.map((c) => [c.id, c.full_name])), [coaches]);
  const match = (n: string, e: string | null) => (n + " " + (e ?? "")).toLowerCase().includes(q.toLowerCase());
  const refresh = () => { ["rw-people", "rw-admin-overview", "rw-removal-log"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); };

  async function link(kind: "learner" | "coach", id: string) {
    setLinking(id);
    try {
      const { url } = await makeLink({ data: { kind, id } });
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Lien d'accès copié. Envoyez-le par WhatsApp ou e-mail : il ne sert qu'une fois.");
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lien impossible à créer."); }
    finally { setLinking(null); }
  }

  const row = (kind: "learner" | "coach", p: RwPerson & { user_id: string | null }) => (
    <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <RwAvatar name={p.full_name} url={p.photo_url} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{p.full_name} {!p.is_active && <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">Inactif</span>}</p>
          <p className="truncate text-sm text-muted-foreground">
            {p.email ?? "Pas d'e-mail"}
            {kind === "learner" && ` · Coach : ${p.coach_id ? coachName[p.coach_id] ?? "Inconnu" : "aucun"}`}
          </p>
        </div>
        {kind === "learner" && <span className="ml-auto rounded-full bg-[var(--rw-soft)] px-3 py-1 text-xs font-bold text-primary">{p.level}</span>}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => link(kind, p.id)} disabled={linking === p.id || !p.email}>
          <Link2 className="mr-1 size-4" /> {p.user_id ? "Nouveau lien" : "Lien d'accès"}
        </Button>
        <Button size="sm" variant="ghost" aria-label="Modifier" onClick={() => setDialog({ kind, person: p })}><Pencil className="size-4" /></Button>
        <Button size="sm" variant="ghost" aria-label={p.is_active ? "Retirer" : "Réactiver"}
          onClick={() => setRemoving({ kind, id: p.id, name: p.full_name, active: p.is_active, learnerCount: kind === "coach" ? (people?.learners ?? []).filter((l) => l.coach_id === p.id).length : 0 })}>
          {p.is_active ? <UserMinus className="size-4 text-destructive" /> : <RotateCcw className="size-4" />}
        </Button>
      </div>
    </li>
  );

  const learners = (people?.learners ?? []).filter((l) => match(l.full_name, l.email));
  const coachList = coaches.filter((c) => match(c.full_name, c.email));
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RwStat label="Apprenants" value={ov?.learners ?? 0} />
        <RwStat label="Coachs" value={ov?.coaches ?? 0} />
        <RwStat label="Textes publiés" value={ov?.lessons ?? 0} hint={`Objectif : ${RW_PROGRAM.length * 30} versions`} />
        <RwStat label="Programme" value={`${RW_PROGRAM.length} sem.`} hint="120 séances, 5 niveaux" />
      </div>
      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-border bg-[var(--rw-soft)] p-5 sm:flex-row sm:items-center">
        <div><p className="font-bold">Bibliothèque pédagogique</p><p className="text-sm text-muted-foreground">Préparez les textes avec l'IA, relisez-les puis publiez-les.</p></div>
        <Button asChild><Link to="/reading-workshop/content">Gérer les textes</Link></Button>
      </div>
      <Tabs defaultValue="learners">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="learners">Apprenants</TabsTrigger>
            <TabsTrigger value="coaches">Coachs</TabsTrigger>
            <TabsTrigger value="progress">Suivi</TabsTrigger>
            <TabsTrigger value="unlock">Déblocage</TabsTrigger>
            <TabsTrigger value="hours">Horaires</TabsTrigger>
            <TabsTrigger value="log">Journal</TabsTrigger>
          </TabsList>
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Rechercher un nom ou un e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <TabsContent value="learners" className="mt-4 space-y-3">
          <Button onClick={() => setDialog({ kind: "learner", person: null })}><Plus className="mr-1 size-4" /> Nouvel apprenant</Button>
          {learners.length ? <ul className="divide-y divide-border rounded-2xl border border-border bg-card shadow-sm">{learners.map((l) => row("learner", l as any))}</ul>
            : <RwEmpty title="Aucun apprenant" text="Créez le premier apprenant pour lui envoyer son lien d'accès." />}
        </TabsContent>
        <TabsContent value="coaches" className="mt-4 space-y-3">
          <Button onClick={() => setDialog({ kind: "coach", person: null })}><Plus className="mr-1 size-4" /> Nouveau coach</Button>
          {coachList.length ? <ul className="divide-y divide-border rounded-2xl border border-border bg-card shadow-sm">{coachList.map((c) => row("coach", c as any))}</ul>
            : <RwEmpty title="Aucun coach" text="Ajoutez un coach pour pouvoir lui confier des apprenants." />}
        </TabsContent>
        <TabsContent value="progress" className="mt-4">
          <RwProgressTable learners={learners as any} subs={subs} coachName={coachName} reportName="rapport-reading-workshop" />
        </TabsContent>
        <TabsContent value="hours" className="mt-4"><RwHoursAdmin /></TabsContent>
        <TabsContent value="log" className="mt-4"><RwRemovalLog /></TabsContent>
        <TabsContent value="unlock" className="mt-4 space-y-3">
          <select className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-sm" value={unlockFor} onChange={(e) => setUnlockFor(e.target.value)} aria-label="Choisir un apprenant">
            <option value="">Choisir un apprenant</option>
            {(people?.learners ?? []).map((l) => <option key={l.id} value={l.id}>{l.full_name} ({l.level})</option>)}
          </select>
          {unlockFor ? <RwLessonPath learnerId={unlockFor} canUnlock /> : <p className="text-sm text-muted-foreground">Sélectionnez un apprenant pour voir son parcours et débloquer un texte avec justification.</p>}
        </TabsContent>
      </Tabs>
      {removing && <RwRemoveDialog target={removing} coaches={coaches.filter((c) => c.is_active)} onClose={() => setRemoving(null)} onDone={refresh} />}
      {dialog && (
        <RwPersonDialog open onOpenChange={(o) => !o && setDialog(null)} kind={dialog.kind} person={dialog.person}
          coaches={coaches.filter((c) => c.is_active)} onSaved={refresh} />
      )}
    </div>
  );
}
