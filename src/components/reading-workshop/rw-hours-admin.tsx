import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RwHoursBanner } from "@/components/reading-workshop/rw-hours-banner";
import { RW_WEEKDAYS, rwLibrevilleDate } from "@/lib/rw-hours";

/** "2026-11-20T14:00" typed as Libreville time (UTC+1, no daylight saving) to ISO. */
const fromLocal = (v: string) => new Date(`${v}:00+01:00`).toISOString();

export function RwHoursAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["rw-hours-admin"],
    queryFn: async () => {
      const [s, e, l] = await Promise.all([
        supabase.from("rw_schedule_settings").select("open_time, close_time, days, closed_message").maybeSingle(),
        supabase.from("rw_schedule_exceptions").select("id, kind, starts_at, ends_at, message, cancelled_at").order("starts_at", { ascending: false }).limit(50),
        supabase.from("rw_schedule_log").select("id, action, created_at").order("created_at", { ascending: false }).limit(30),
      ]);
      if (s.error || e.error || l.error) throw new Error((s.error ?? e.error ?? l.error)!.message);
      return { settings: s.data, exceptions: e.data ?? [], log: l.data ?? [] };
    },
  });
  const [open, setOpen] = useState("12:30");
  const [close, setClose] = useState("22:30");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [msg, setMsg] = useState("");
  const [ex, setEx] = useState({ kind: "closed", starts: "", ends: "", message: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!data?.settings) return;
    setOpen(data.settings.open_time.slice(0, 5)); setClose(data.settings.close_time.slice(0, 5));
    setDays(data.settings.days); setMsg(data.settings.closed_message ?? "");
  }, [data?.settings]);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["rw-hours-admin"] }); qc.invalidateQueries({ queryKey: ["rw-workshop-status"] }); };

  async function save() {
    setBusy(true);
    const { error } = await supabase.rpc("rw_schedule_update", { _open: open, _close: close, _days: days, _message: msg });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Horaires enregistrés."); refresh();
  }
  async function addException() {
    if (!ex.starts || !ex.ends) return toast.error("Indiquez le début et la fin.");
    setBusy(true);
    const { error } = await supabase.rpc("rw_schedule_add_exception", { _kind: ex.kind, _starts: fromLocal(ex.starts), _ends: fromLocal(ex.ends), _message: ex.message });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Exception ajoutée."); setEx({ kind: "closed", starts: "", ends: "", message: "" }); refresh();
  }
  async function cancel(id: string) {
    const { error } = await supabase.rpc("rw_schedule_cancel_exception", { _id: id });
    if (error) return toast.error(error.message);
    toast.success("Exception annulée."); refresh();
  }
  const now = Date.now();
  return (
    <div className="space-y-6">
      <RwHoursBanner exempt />
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h3 className="font-bold">Horaires habituels (heure de Libreville)</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          De <Input type="time" value={open} onChange={(e) => setOpen(e.target.value)} className="w-32" aria-label="Ouverture" />
          à <Input type="time" value={close} onChange={(e) => setClose(e.target.value)} className="w-32" aria-label="Fermeture" />
        </div>
        <div className="flex flex-wrap gap-2">
          {RW_WEEKDAYS.map((d, i) => {
            const on = days.includes(i + 1);
            return <Button key={d} size="sm" type="button" variant={on ? "default" : "outline"} onClick={() => setDays(on ? days.filter((x) => x !== i + 1) : [...days, i + 1])}>{d}</Button>;
          })}
        </div>
        <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Message affiché quand l'atelier est fermé (facultatif)" maxLength={500} />
        <Button disabled={busy} onClick={save}>Enregistrer les horaires</Button>
      </section>
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h3 className="font-bold">Ouverture ou fermeture exceptionnelle</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select value={ex.kind} onChange={(e) => setEx({ ...ex, kind: e.target.value })} className="rounded-md border border-border bg-background px-3 py-2" aria-label="Type">
            <option value="closed">Fermeture</option><option value="open">Ouverture</option>
          </select>
          du <Input type="datetime-local" value={ex.starts} onChange={(e) => setEx({ ...ex, starts: e.target.value })} className="w-56" aria-label="Début" />
          au <Input type="datetime-local" value={ex.ends} onChange={(e) => setEx({ ...ex, ends: e.target.value })} className="w-56" aria-label="Fin" />
        </div>
        <Input value={ex.message} onChange={(e) => setEx({ ...ex, message: e.target.value })} placeholder="Message pour les apprenants (facultatif)" maxLength={300} />
        <Button disabled={busy} onClick={addException}>Ajouter</Button>
        <ul className="divide-y divide-border text-sm">
          {(data?.exceptions ?? []).map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="font-semibold">{e.kind === "open" ? "Ouverture" : "Fermeture"}</span>
              <span className="text-muted-foreground">{rwLibrevilleDate(e.starts_at)} au {rwLibrevilleDate(e.ends_at)}</span>
              {e.message && <span className="italic">« {e.message} »</span>}
              {e.cancelled_at ? <span className="ml-auto text-xs text-muted-foreground">Annulée</span>
                : new Date(e.ends_at).getTime() > now && <Button size="sm" variant="ghost" className="ml-auto" onClick={() => cancel(e.id)}>Annuler</Button>}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-2 font-bold">Historique</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {(data?.log ?? []).map((l) => <li key={l.id}>{rwLibrevilleDate(l.created_at)} · {l.action}</li>)}
          {!data?.log?.length && <li>Aucune modification pour le moment.</li>}
        </ul>
      </section>
    </div>
  );
}
