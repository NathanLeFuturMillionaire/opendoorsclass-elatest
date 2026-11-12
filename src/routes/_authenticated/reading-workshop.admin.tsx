import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RwEmpty, RwShell, RwStat } from "@/components/reading-workshop/rw-shell";
import { getRwAdminOverview } from "@/lib/reading-workshop.functions";
import { RW_PROGRAM } from "@/lib/reading-workshop";

export const Route = createFileRoute("/_authenticated/reading-workshop/admin")({
  head: () => ({ meta: [{ title: "Administration, Reading Workshop OpenDoorsClass" }] }),
  component: () => (
    <RwShell need="admin" title="Administration du Reading Workshop" subtitle="Vue d'ensemble des apprenants, des coachs et de la bibliothèque.">
      <AdminOverview />
    </RwShell>
  ),
});

function AdminOverview() {
  const fetchOverview = useServerFn(getRwAdminOverview);
  const { data } = useQuery({ queryKey: ["rw-admin-overview"], queryFn: () => fetchOverview() });
  const sessions = RW_PROGRAM.length * 6;
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RwStat label="Apprenants" value={data?.learners ?? 0} />
        <RwStat label="Coachs" value={data?.coaches ?? 0} />
        <RwStat label="Textes en bibliothèque" value={data?.lessons ?? 0} hint={`Objectif : ${sessions * 5} versions`} />
        <RwStat label="Programme" value={`${RW_PROGRAM.length} semaines`} hint={`${sessions} séances, 5 niveaux`} />
      </div>
      <RwEmpty title="Création des apprenants et des coachs" text="La gestion des comptes (photo, niveau, coach, lien d'accès) arrive dans la prochaine étape." />
    </div>
  );
}
