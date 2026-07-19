import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listCandidates, suspendCandidate, deleteCandidate, adjustCandidateCredits } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Coins } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/candidats")({
  component: CandidatesPage,
});

function CandidatesPage() {
  const [search, setSearch] = useState("");
  const list = useServerFn(listCandidates);
  const suspend = useServerFn(suspendCandidate);
  const del = useServerFn(deleteCandidate);
  const adjust = useServerFn(adjustCandidateCredits);
  const qc = useQueryClient();
  const [creditTarget, setCreditTarget] = useState<{ id: string; name: string; current: number } | null>(null);
  const [creditDelta, setCreditDelta] = useState<string>("1");
  const [creditReason, setCreditReason] = useState<string>("");
  const [saving, setSaving] = useState(false);

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

  async function saveCredits() {
    if (!creditTarget) return;
    const delta = parseInt(creditDelta, 10);
    if (!Number.isFinite(delta) || delta === 0) {
      toast.error("Saisissez un nombre différent de zéro (positif ou négatif).");
      return;
    }
    setSaving(true);
    try {
      const res = await adjust({ data: { userId: creditTarget.id, delta, reason: creditReason || undefined } });
      toast.success(`Crédits mis à jour : ${res.credits}`);
      setCreditTarget(null);
      setCreditDelta("1");
      setCreditReason("");
      qc.invalidateQueries({ queryKey: ["admin-candidates"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
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
                    <th className="p-3">Crédits</th>
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
                      <td className="p-3">{c.nationality ?? "-"}</td>
                      <td className="p-3 font-medium">{c.credits_remaining ?? 0}</td>
                      <td className="p-3">{c.test_count}</td>
                      <td className="p-3">{c.best_score ? `${Math.round(c.best_score)}%` : "-"}</td>
                      <td className="p-3">{c.last_level ?? "-"}</td>
                      <td className="p-3">{c.suspended ? <Badge variant="destructive">Suspendu</Badge> : <Badge variant="secondary">Actif</Badge>}</td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="mr-2"
                          onClick={() => {
                            setCreditTarget({ id: c.id, name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.candidate_number, current: c.credits_remaining ?? 0 });
                            setCreditDelta("1");
                            setCreditReason("");
                          }}
                        >
                          <Coins className="mr-1 size-4" /> Crédits
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onSuspend(c.id, !c.suspended)} className="mr-2">
                          {c.suspended ? "Réactiver" : "Suspendre"}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onDelete(c.id)}>Supprimer</Button>
                      </td>
                    </tr>
                  ))}
                  {(data ?? []).length === 0 && (
                    <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Aucun candidat.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!creditTarget} onOpenChange={(o) => !o && setCreditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajuster les crédits</DialogTitle>
          </DialogHeader>
          {creditTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm">
                <div><span className="text-muted-foreground">Candidat :</span> <span className="font-medium">{creditTarget.name}</span></div>
                <div><span className="text-muted-foreground">Solde actuel :</span> <span className="font-medium">{creditTarget.current} crédits</span></div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="credit-delta">Ajustement (positif pour ajouter, négatif pour retirer)</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setCreditDelta("1")}>+1</Button>
                  <Button size="sm" variant="outline" onClick={() => setCreditDelta("5")}>+5</Button>
                  <Button size="sm" variant="outline" onClick={() => setCreditDelta("10")}>+10</Button>
                  <Button size="sm" variant="outline" onClick={() => setCreditDelta("-1")}>-1</Button>
                </div>
                <Input id="credit-delta" type="number" value={creditDelta} onChange={(e) => setCreditDelta(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credit-reason">Motif (optionnel)</Label>
                <Input id="credit-reason" placeholder="Ex : offert commercial, remboursement..." value={creditReason} onChange={(e) => setCreditReason(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreditTarget(null)}>Annuler</Button>
                <Button onClick={saveCredits} disabled={saving}>{saving ? "Enregistrement..." : "Confirmer"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}