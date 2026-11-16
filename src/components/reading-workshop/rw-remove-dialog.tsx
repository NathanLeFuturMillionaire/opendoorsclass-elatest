import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type RwRemoveTarget = { kind: "learner" | "coach"; id: string; name: string; active: boolean; learnerCount?: number };

/** Reversible removal (deactivation) or reactivation, always with a written reason. Rules are enforced by the database. */
export function RwRemoveDialog({ target, coaches = [], onClose, onDone }: {
  target: RwRemoveTarget; coaches?: { id: string; full_name: string }[]; onClose: () => void; onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [reassign, setReassign] = useState("");
  const [busy, setBusy] = useState(false);
  const removing = target.active;
  const needsReassign = removing && target.kind === "coach" && (target.learnerCount ?? 0) > 0;
  const others = coaches.filter((c) => c.id !== target.id);
  const ok = reason.trim().length >= 5 && (!needsReassign || !!reassign);

  async function submit() {
    setBusy(true);
    const { data, error } = await supabase.rpc("rw_set_active", {
      _kind: target.kind, _id: target.id, _active: !removing, _reason: reason.trim(), _reassign_to: reassign || undefined,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const d = data as { moved?: number; pending?: number } | null;
    toast.success(removing
      ? `${target.name} a été retiré.${d?.moved ? ` ${d.moved} apprenant(s) confié(s) au nouveau coach, ${d.pending ?? 0} correction(s) en attente transférée(s).` : ""}`
      : `${target.name} est de nouveau actif.`);
    onDone(); onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{removing ? `Retirer ${target.name} ?` : `Réactiver ${target.name} ?`}</DialogTitle>
          <DialogDescription>
            {removing
              ? "Son accès au Reading Workshop est coupé, mais rien n'est effacé : vous pourrez le réactiver à tout moment. L'action est enregistrée dans le journal."
              : "Son accès au Reading Workshop est rétabli avec tout son historique."}
          </DialogDescription>
        </DialogHeader>
        {needsReassign && (
          <div className="space-y-1">
            <label className="text-sm font-semibold" htmlFor="rw-reassign">Coach qui reprend ses {target.learnerCount} apprenant(s)</label>
            <select id="rw-reassign" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={reassign} onChange={(e) => setReassign(e.target.value)}>
              <option value="">Choisir un coach actif</option>
              {others.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
            {!others.length && <p className="text-sm text-destructive">Ajoutez d'abord un autre coach actif.</p>}
            <p className="text-xs text-muted-foreground">Les travaux en attente de correction suivent les apprenants.</p>
          </div>
        )}
        <div className="space-y-1">
          <label className="text-sm font-semibold" htmlFor="rw-reason">Motif (obligatoire)</label>
          <Textarea id="rw-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. : fin de la formation, demande de l'apprenant" maxLength={500} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant={removing ? "destructive" : "default"} disabled={!ok || busy} onClick={submit}>
            {busy ? "Enregistrement..." : removing ? "Retirer" : "Réactiver"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Staff journal of removals and reactivations. */
export function RwRemovalLog() {
  const { data = [] } = useQuery({
    queryKey: ["rw-removal-log"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rw_removal_log").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw new Error(error.message);
      return data;
    },
  });
  if (!data.length) return <p className="text-sm text-muted-foreground">Aucun retrait ni réactivation pour le moment.</p>;
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-card text-sm shadow-sm">
      {data.map((r) => (
        <li key={r.id} className="p-3">
          <p className="font-semibold">
            {r.action === "deactivate" ? "Retrait" : "Réactivation"} · {r.target_kind === "coach" ? "coach" : "apprenant"} {r.target_name}
          </p>
          <p className="text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")} · Motif : {r.reason}
            {r.moved_learners > 0 && ` · ${r.moved_learners} apprenant(s) réaffecté(s), ${r.pending_reviews} correction(s) en attente`}</p>
        </li>
      ))}
    </ul>
  );
}

export function useInvalidateRwPeople() {
  const qc = useQueryClient();
  return () => ["rw-people", "rw-admin-overview", "rw-coach-learners", "rw-removal-log"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}
