import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RwAvatar } from "@/components/reading-workshop/rw-shell";
import { saveRwPerson } from "@/lib/reading-workshop.functions";
import { RW_LEVELS, type RwLevel } from "@/lib/reading-workshop";

export type RwPerson = {
  id: string; full_name: string; email: string | null; photo_path: string | null; photo_url: string | null;
  is_active: boolean; level?: RwLevel; coach_id?: string | null; start_date?: string | null; bio?: string | null;
};

export function RwPersonDialog({ open, onOpenChange, kind, person, coaches, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; kind: "learner" | "coach"; person: RwPerson | null;
  coaches: { id: string; full_name: string }[]; onSaved: () => void;
}) {
  const save = useServerFn(saveRwPerson);
  const [f, setF] = useState({ full_name: "", email: "", level: "A1" as RwLevel, coach_id: "none", start_date: "", bio: "", is_active: true });
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF({
      full_name: person?.full_name ?? "", email: person?.email ?? "", level: person?.level ?? "A1",
      coach_id: person?.coach_id ?? "none", start_date: person?.start_date ?? "", bio: person?.bio ?? "", is_active: person?.is_active ?? true,
    });
    setPhotoPath(person?.photo_path ?? null);
    setPreview(person?.photo_url ?? null);
  }, [open, person]);

  // Placement test suggestion (staff-only database check); the admin keeps the final say.
  const [suggest, setSuggest] = useState<{ level: RwLevel; tested_at: string | null } | null>(null);
  useEffect(() => {
    setSuggest(null);
    const email = f.email.trim();
    if (!open || kind !== "learner" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    let alive = true;
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("rw_placement_suggestion", { _email: email });
      const row = Array.isArray(data) ? data[0] : null;
      if (!alive || error || !row?.level || !RW_LEVELS.some((l) => l.code === row.level)) return;
      setSuggest({ level: row.level as RwLevel, tested_at: row.tested_at });
    }, 500);
    return () => { alive = false; clearTimeout(t); };
  }, [f.email, open, kind]);

  async function onPhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choisissez une image.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image trop lourde (5 Mo maximum).");
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${kind}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("rw-photos").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return toast.error("Échec de l'envoi de la photo.");
    setPhotoPath(path);
    setPreview(URL.createObjectURL(file));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await save({ data: {
        kind, id: person?.id, full_name: f.full_name, email: f.email, photo_path: photoPath, is_active: f.is_active,
        level: f.level, coach_id: f.coach_id === "none" ? null : f.coach_id, start_date: f.start_date || null, bio: f.bio,
      } });
      toast.success(person ? "Modifications enregistrées." : kind === "learner" ? "Apprenant créé." : "Coach créé.");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally { setBusy(false); }
  }

  const label = kind === "learner" ? "apprenant" : "coach";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rw-theme max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{person ? `Modifier ${person.full_name}` : `Nouvel ${label}`}</DialogTitle>
          <DialogDescription>Ces informations apparaissent dans l'espace de la personne.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-center gap-4">
            <RwAvatar name={f.full_name || "?"} url={preview} size={72} />
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              {preview ? "Changer la photo" : "Ajouter une photo"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
            </label>
          </div>
          <div className="space-y-1.5"><Label htmlFor="rw-name">Nom complet</Label>
            <Input id="rw-name" required value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="rw-email">Adresse e-mail (pour le lien d'accès)</Label>
            <Input id="rw-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          {kind === "learner" && suggest && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--rw-soft)] p-3 text-sm">
              <span>Niveau recommandé par le test de niveau : <strong>{suggest.level}</strong>{suggest.tested_at ? ` (test du ${new Date(suggest.tested_at).toLocaleDateString("fr-FR")})` : ""}</span>
              {f.level !== suggest.level ? <Button type="button" size="sm" variant="outline" onClick={() => setF((cur) => ({ ...cur, level: suggest.level }))}>Appliquer</Button>
                : <span className="text-xs font-semibold text-primary">Appliqué</span>}
            </div>
          )}
          {kind === "learner" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Niveau</Label>
                <Select value={f.level} onValueChange={(v) => setF({ ...f, level: v as RwLevel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RW_LEVELS.map((l) => <SelectItem key={l.code} value={l.code}>{l.code} · {l.fr}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="space-y-1.5"><Label>Coach</Label>
                <Select value={f.coach_id} onValueChange={(v) => setF({ ...f, coach_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun coach</SelectItem>
                    {coaches.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="rw-start">Date de début</Label>
                <Input id="rw-start" type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></div>
            </div>
          ) : (
            <div className="space-y-1.5"><Label htmlFor="rw-bio">Présentation</Label>
              <Textarea id="rw-bio" rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></div>
          )}
          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
            <Label htmlFor="rw-active">Accès actif</Label>
            <Switch id="rw-active" checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} />
          </div>
          <Button type="submit" className="w-full" disabled={busy || uploading}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Enregistrer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
