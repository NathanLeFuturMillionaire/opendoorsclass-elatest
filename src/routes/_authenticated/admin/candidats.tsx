import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listCandidates, suspendCandidate, deleteCandidate } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/candidats")({
  component: CandidatesPage,
});

function CandidatesPage() {
  const [search, setSearch] = useState("");
  const list = useServerFn(listCandidates);
  const suspend = useServerFn(suspendCandidate);
  const del = useServerFn(deleteCandidate);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-candidates", search],
    queryFn: () => list({ data: { search: search || undefined } }),
  });

  async function onSuspend(id: string, next: boolean) {
    try {
      await suspend({ data: { userId: id, suspended: next } });
      toast.success(next ? "Candidat suspendu" : "Candidat réactivé");
      qc.invalidateQueries({ queryKey: ["admin-candidates"] });
    } catch (e: any) { toast.error(e.message); }
  }
  async function onDelete(id: string) {
    if (!confirm("Supprimer définitivement ce candidat ? Action irréversible.")) return;
    try {
      await del({ data: { userId: id } });
      toast.success("Candidat supprimé");
      qc.invalidateQueries({ queryKey: ["admin-candidates"] });
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Candidats</h1>
        <p className="text-sm text-muted-foreground">Rechercher, suspendre ou supprimer un candidat.</p>
      </div>
      <Input placeholder="Rechercher par nom ou numéro..." value={search} onChange={(e) => setSearch(e.target.value)} />
      {isLoading ? <p className="text-muted-foreground">Chargement...</p> : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr className="text-left">
                    <th className="p-3">Nom</th>
                    <th className="p-3">N° candidat</th>
                    <th className="p-3">Pays</th>
                    <th className="p-3">Tests</th>
                    <th className="p-3">Meilleur</th>
                    <th className="p-3">Niveau</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data ?? []).map((c: any) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3">{c.first_name} {c.last_name}</td>
                      <td className="p-3 font-mono text-xs">{c.candidate_number}</td>
                      <td className="p-3">{c.nationality ?? "—"}</td>
                      <td className="p-3">{c.test_count}</td>
                      <td className="p-3">{c.best_score ? `${Math.round(c.best_score)}%` : "—"}</td>
                      <td className="p-3">{c.last_level ?? "—"}</td>
                      <td className="p-3">{c.suspended ? <Badge variant="destructive">Suspendu</Badge> : <Badge variant="secondary">Actif</Badge>}</td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => onSuspend(c.id, !c.suspended)} className="mr-2">
                          {c.suspended ? "Réactiver" : "Suspendre"}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onDelete(c.id)}>Supprimer</Button>
                      </td>
                    </tr>
                  ))}
                  {(data ?? []).length === 0 && (
                    <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Aucun candidat.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}