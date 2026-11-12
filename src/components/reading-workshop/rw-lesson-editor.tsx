import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRwLesson, saveRwLesson, type RwLessonEdit } from "@/lib/rw-lessons.functions";

export function RwLessonEditor({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: () => void }) {
  const fetchLesson = useServerFn(getRwLesson);
  const save = useServerFn(saveRwLesson);
  const { data } = useQuery({ queryKey: ["rw-lesson", id], queryFn: () => fetchLesson({ data: { id } }) });
  const [f, setF] = useState<RwLessonEdit | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setF({
      id, title: data.title, body: data.body, summary_fr: data.summary_fr ?? "", translation_fr: data.translation_fr ?? "",
      knowledge_point: data.knowledge_point ?? "", mention: data.mention, source_author: data.source_author ?? "",
      source_title: data.source_title ?? "", source_date: data.source_date ?? "", source_institution: data.source_institution ?? "",
      source_url: data.source_url ?? "", rights_status: data.rights_status ?? "", status: data.status,
    });
  }, [data, id]);

  async function submit(status: "draft" | "published") {
    if (!f) return;
    setBusy(true);
    try {
      await save({ data: { ...f, status } });
      toast.success(status === "published" ? "Texte publié pour les apprenants." : "Brouillon enregistré.");
      onSaved(); onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  }

  const field = (k: keyof RwLessonEdit, label: string, area = false, rows = 3) => (
    <div className="space-y-1.5">
      <Label htmlFor={`rwe-${k}`}>{label}</Label>
      {area ? <Textarea id={`rwe-${k}`} rows={rows} value={(f?.[k] as string) ?? ""} onChange={(e) => setF({ ...f!, [k]: e.target.value })} />
        : <Input id={`rwe-${k}`} value={(f?.[k] as string) ?? ""} onChange={(e) => setF({ ...f!, [k]: e.target.value })} />}
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rw-theme max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{data ? `${data.level} · ${data.rw_sessions?.title}` : "Chargement"}</DialogTitle>
          <DialogDescription>{data ? `${data.word_count} mots · ${data.status === "published" ? "Publié" : "Brouillon"} · ${data.vocabulary?.length ?? 0} mots de vocabulaire, ${data.questions?.length ?? 0} questions` : ""}</DialogDescription>
        </DialogHeader>
        {!f ? <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-primary" /></div> : (
          <div className="space-y-4">
            {field("title", "Titre")}
            {field("body", "Texte en anglais", true, 12)}
            {field("knowledge_point", "Ce que l'apprenant découvre")}
            {field("summary_fr", "Résumé en français", true)}
            {field("translation_fr", "Traduction complète", true, 8)}
            <div className="rounded-2xl border border-border p-4">
              <p className="mb-3 font-semibold">Fiche source</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Type</Label>
                  <Select value={f.mention} onValueChange={(v) => setF({ ...f, mention: v as RwLessonEdit["mention"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="original">Texte original</SelectItem>
                      <SelectItem value="adapted">Adaptation</SelectItem>
                      <SelectItem value="excerpt">Extrait</SelectItem>
                    </SelectContent>
                  </Select></div>
                {field("source_author", "Auteur")}
                {field("source_title", "Titre du document original")}
                {field("source_date", "Date")}
                {field("source_institution", "Institution ou site")}
                {field("source_url", "Lien de référence (https://)")}
              </div>
              <div className="mt-3">{field("rights_status", "Droits de réutilisation")}</div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" disabled={busy} onClick={() => submit("draft")}>{f.status === "published" ? "Repasser en brouillon" : "Enregistrer le brouillon"}</Button>
              <Button disabled={busy} onClick={() => submit("published")}>{busy && <Loader2 className="mr-2 size-4 animate-spin" />}Valider et publier</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
