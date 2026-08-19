import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listQuestions,
  upsertQuestion,
  deleteQuestion,
  getAssessmentPoolCoverage,
} from "@/lib/admin.functions";
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
  id?: string;
  level: string;
  category: string;
  language: "en" | "es";
  question_type: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  audio_url?: string | null;
  image_url?: string | null;
  image_alt?: string | null;
  explanation?: string | null;
  points?: number;
  max_plays?: number;
  order_hint?: number;
  is_active?: boolean;
};

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const CATEGORIES = [
  "grammar",
  "vocabulary",
  "orthography",
  "reading",
  "listening",
  "writing",
  "speaking",
] as const;
const TYPES = ["mcq", "image_choice", "audio", "open_text", "speaking"] as const;

function emptyQuestion(language: "en" | "es"): Q {
  return {
    level: "A1",
    category: "grammar",
    language,
    question_type: "mcq",
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
    audio_url: "",
    image_url: "",
    image_alt: "",
    explanation: "",
    points: 1,
    max_plays: 5,
    order_hint: 0,
    is_active: true,
  };
}

function QuestionsPage() {
  const [language, setLanguage] = useState<"en" | "es">("en");
  const list = useServerFn(listQuestions);
  const upsert = useServerFn(upsertQuestion);
  const del = useServerFn(deleteQuestion);
  const coverageFn = useServerFn(getAssessmentPoolCoverage);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Q | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-questions", language],
    queryFn: () => list({ data: { language } }),
  });
  const coverage = useQuery({
    queryKey: ["admin-pool-coverage", "es"],
    queryFn: () => coverageFn({ data: { language: "es" as const } }),
    enabled: language === "es",
  });

  function openNew() { setEditing(emptyQuestion(language)); setOpen(true); }
  function openEdit(q: any) {
    setEditing({
      ...q,
      language: (q.language ?? language) as "en" | "es",
      question_type: q.question_type ?? "mcq",
      options: Array.isArray(q.options) && q.options.length ? q.options : ["", "", "", ""],
      audio_url: q.audio_url ?? "",
      image_url: q.image_url ?? "",
      image_alt: q.image_alt ?? "",
      explanation: q.explanation ?? "",
      points: q.points ?? 1,
      max_plays: q.max_plays ?? 5,
    });
    setOpen(true);
  }
  async function save() {
    if (!editing) return;
    const openEnded = editing.question_type === "open_text" || editing.question_type === "speaking";
    try {
      const payload: any = { ...editing };
      if (!payload.audio_url) delete payload.audio_url;
      if (!payload.image_url) delete payload.image_url;
      if (!payload.image_alt) payload.image_alt = null;
      if (!payload.explanation) payload.explanation = null;
      payload.options = payload.options.filter((o: string) => o.trim());
      if (!openEnded) {
        if (payload.options.length < 2) {
          toast.error("Au moins deux options sont requises pour ce type de question.");
          return;
        }
        if (!payload.correct_answer.trim()) {
          toast.error("Indiquez la réponse correcte.");
          return;
        }
      }
      await upsert({ data: payload });
      toast.success("Question enregistrée");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-questions"] });
      qc.invalidateQueries({ queryKey: ["admin-pool-coverage"] });
    } catch (e: any) { toast.error(e.message); }
  }
  async function onDelete(id: string) {
    if (!confirm("Supprimer définitivement cette question ? Les sessions déjà en cours ne sont pas modifiées.")) return;
    try {
      await del({ data: { id } });
      toast.success("Supprimée");
      qc.invalidateQueries({ queryKey: ["admin-questions"] });
      qc.invalidateQueries({ queryKey: ["admin-pool-coverage"] });
    } catch (e: any) { toast.error(e.message); }
  }

  const rows = (data ?? []).filter(
    (q: any) =>
      (filter === "all" || q.level === filter) &&
      (categoryFilter === "all" || q.category === categoryFilter),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Questions</h1>
          <p className="text-sm text-muted-foreground">
            Gérer la banque de questions du test, par langue, niveau et compétence.
          </p>
        </div>
        <Button onClick={openNew}><Plus className="mr-1 size-4" /> Nouvelle question</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["en", "es"] as const).map((lg) => (
          <Button
            key={lg}
            size="sm"
            variant={language === lg ? "default" : "outline"}
            onClick={() => setLanguage(lg)}
          >
            {lg === "en" ? "🇬🇧 Anglais" : "🇪🇸 Espagnol"}
          </Button>
        ))}
        <span className="ml-auto self-center text-xs text-muted-foreground">
          {rows.length} question(s) affichée(s)
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", ...LEVELS].map((l) => (
          <Button key={l} size="sm" variant={filter === l ? "default" : "outline"} onClick={() => setFilter(l)}>{l}</Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {["all", ...CATEGORIES].map((c) => (
          <Button
            key={c}
            size="sm"
            variant={categoryFilter === c ? "secondary" : "ghost"}
            className="capitalize"
            onClick={() => setCategoryFilter(c)}
          >
            {c}
          </Button>
        ))}
      </div>
      {language === "es" ? <PoolCoverage data={coverage.data} /> : null}
      {isLoading ? <p className="text-muted-foreground">Chargement...</p> : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr className="text-left">
                    <th className="p-3">Niveau</th>
                    <th className="p-3">Catégorie</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Question</th>
                    <th className="p-3">Points</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((q: any) => (
                    <tr key={q.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3"><Badge variant="outline">{q.level}</Badge></td>
                      <td className="p-3 text-xs">{q.category}</td>
                      <td className="p-3 text-xs text-muted-foreground">{q.question_type ?? "mcq"}</td>
                      <td className="p-3 max-w-md truncate">{q.question_text}</td>
                      <td className="p-3 text-xs">{q.points ?? 1}</td>
                      <td className="p-3">{q.is_active ? <Badge variant="secondary">Actif</Badge> : <Badge variant="destructive">Inactif</Badge>}</td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(q)}><Pencil className="size-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => onDelete(q.id)}><Trash2 className="size-4" /></Button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 ? (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Aucune question pour ces filtres.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Modifier" : "Nouvelle question"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Select value={editing.language} onValueChange={(v) => setEditing({ ...editing, language: v as "en" | "es" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">Anglais</SelectItem>
                    <SelectItem value="es">Espagnol</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={editing.question_type} onValueChange={(v) => setEditing({ ...editing, question_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={editing.level} onValueChange={(v) => setEditing({ ...editing, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Énoncé de la question" value={editing.question_text} onChange={(e) => setEditing({ ...editing, question_text: e.target.value })} rows={3} />
              <Input placeholder="URL audio (optionnel, pour listening)" value={editing.audio_url ?? ""} onChange={(e) => setEditing({ ...editing, audio_url: e.target.value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="URL image (optionnel)" value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} />
                <Input placeholder="Texte alternatif de l'image" value={editing.image_alt ?? ""} onChange={(e) => setEditing({ ...editing, image_alt: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Options</label>
                {editing.options.map((opt, i) => (
                  <Input key={i} placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => {
                    const next = [...editing.options]; next[i] = e.target.value;
                    setEditing({ ...editing, options: next });
                  }} />
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing({ ...editing, options: [...editing.options, ""] })}
                  disabled={editing.options.length >= 6}
                >
                  Ajouter une option
                </Button>
              </div>
              <Input placeholder="Réponse correcte (doit correspondre à une option)" value={editing.correct_answer} onChange={(e) => setEditing({ ...editing, correct_answer: e.target.value })} />
              <Textarea placeholder="Explication (affichée dans la correction, optionnelle)" rows={2} value={editing.explanation ?? ""} onChange={(e) => setEditing({ ...editing, explanation: e.target.value })} />
              <div className="grid gap-3 sm:grid-cols-3">
                <Input type="number" min={1} max={20} placeholder="Points" value={editing.points ?? 1} onChange={(e) => setEditing({ ...editing, points: Number(e.target.value) || 1 })} />
                <Input type="number" min={1} max={10} placeholder="Écoutes max" value={editing.max_plays ?? 5} onChange={(e) => setEditing({ ...editing, max_plays: Number(e.target.value) || 5 })} />
                <Input type="number" placeholder="Ordre" value={editing.order_hint ?? 0} onChange={(e) => setEditing({ ...editing, order_hint: Number(e.target.value) || 0 })} />
              </div>
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
type Coverage = Awaited<ReturnType<typeof getAssessmentPoolCoverage>>;

/** Randomisation depth of the Spanish bank, per level and skill. */
function PoolCoverage({ data }: { data?: Coverage }) {
  if (!data) return null;
  const alerts = data.cells.filter((c) => c.status !== "ok");
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">Profondeur de tirage (Espagnol)</h2>
          <Badge variant={data.criticalCount ? "destructive" : alerts.length ? "outline" : "secondary"}>
            {data.criticalCount
              ? `${data.criticalCount} catégorie(s) insuffisante(s)`
              : alerts.length
                ? `${alerts.length} pool(s) trop mince(s)`
                : "Randomisation optimale"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Seuil recommandé : au moins {data.minPoolRatio} fois le quota par niveau et compétence, pour
          que deux tentatives successives ne retombent pas sur les mêmes questions.
        </p>
        {alerts.length ? (
          <ul className="grid gap-1 text-xs sm:grid-cols-2">
            {alerts.map((c) => (
              <li key={`${c.level}-${c.skill}-${c.type}`} className="flex items-center gap-2">
                <Badge variant={c.status === "critical" ? "destructive" : "outline"}>{c.level}</Badge>
                <span className="text-muted-foreground">
                  {c.skill} ({c.type}) : {c.available} disponible(s), {c.required} servie(s) par test,
                  {" "}{c.recommended} recommandée(s)
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
