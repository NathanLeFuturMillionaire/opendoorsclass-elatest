import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listQuestions, upsertQuestion, deleteQuestion } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/questions")({
  component: QuestionsPage,
});

type Q = {
  id?: string; level: string; category: string; question_text: string;
  options: string[]; correct_answer: string; audio_url?: string | null;
  order_hint?: number; is_active?: boolean;
};

const EMPTY: Q = { level: "A1", category: "grammar", question_text: "", options: ["", "", "", ""], correct_answer: "", order_hint: 0, is_active: true };

function QuestionsPage() {
  const list = useServerFn(listQuestions);
  const upsert = useServerFn(upsertQuestion);
  const del = useServerFn(deleteQuestion);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Q | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const { data, isLoading } = useQuery({ queryKey: ["admin-questions"], queryFn: () => list() });

  function openNew() { setEditing({ ...EMPTY }); setOpen(true); }
  function openEdit(q: any) { setEditing({ ...q, audio_url: q.audio_url ?? "" }); setOpen(true); }
  async function save() {
    if (!editing) return;
    try {
      const payload: any = { ...editing };
      if (!payload.audio_url) delete payload.audio_url;
      payload.options = payload.options.filter((o: string) => o.trim());
      await upsert({ data: payload });
      toast.success("Question enregistrée");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-questions"] });
    } catch (e: any) { toast.error(e.message); }
  }
  async function onDelete(id: string) {
    if (!confirm("Supprimer cette question ?")) return;
    try {
      await del({ data: { id } });
      toast.success("Supprimée");
      qc.invalidateQueries({ queryKey: ["admin-questions"] });
    } catch (e: any) { toast.error(e.message); }
  }

  const rows = (data ?? []).filter((q: any) => filter === "all" || q.level === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Questions</h1>
          <p className="text-sm text-muted-foreground">Gérer la banque de questions du test.</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-1 size-4" /> Nouvelle question</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {["all", "A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
          <Button key={l} size="sm" variant={filter === l ? "default" : "outline"} onClick={() => setFilter(l)}>{l}</Button>
        ))}
      </div>
      {isLoading ? <p className="text-muted-foreground">Chargement...</p> : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr className="text-left"><th className="p-3">Niveau</th><th className="p-3">Catégorie</th><th className="p-3">Question</th><th className="p-3">Statut</th><th className="p-3 text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {rows.map((q: any) => (
                    <tr key={q.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3"><Badge variant="outline">{q.level}</Badge></td>
                      <td className="p-3 text-xs">{q.category}</td>
                      <td className="p-3 max-w-md truncate">{q.question_text}</td>
                      <td className="p-3">{q.is_active ? <Badge variant="secondary">Actif</Badge> : <Badge variant="destructive">Inactif</Badge>}</td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(q)}><Pencil className="size-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => onDelete(q.id)}><Trash2 className="size-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Modifier" : "Nouvelle question"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Select value={editing.level} onValueChange={(v) => setEditing({ ...editing, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["A1","A2","B1","B2","C1","C2"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["grammar","vocabulary","reading","listening"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Énoncé de la question" value={editing.question_text} onChange={(e) => setEditing({ ...editing, question_text: e.target.value })} rows={3} />
              <Input placeholder="URL audio (optionnel, pour listening)" value={editing.audio_url ?? ""} onChange={(e) => setEditing({ ...editing, audio_url: e.target.value })} />
              <div className="space-y-2">
                <label className="text-sm font-medium">Options</label>
                {editing.options.map((opt, i) => (
                  <Input key={i} placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => {
                    const next = [...editing.options]; next[i] = e.target.value;
                    setEditing({ ...editing, options: next });
                  }} />
                ))}
              </div>
              <Input placeholder="Réponse correcte (doit correspondre à une option)" value={editing.correct_answer} onChange={(e) => setEditing({ ...editing, correct_answer: e.target.value })} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={save}>Enregistrer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}