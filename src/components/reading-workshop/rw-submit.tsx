import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type * as tus from "tus-js-client";
import { Circle, Mic, Pause, Play, RotateCcw, Send, Square, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { startRwUpload } from "@/lib/rw-submissions";
import { cn } from "@/lib/utils";

type Kind = "audio" | "video";

export function RwSubmit({ learnerId, lessonId }: { learnerId: string; lessonId: string }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>("audio");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [note, setNote] = useState("");
  const [pct, setPct] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const live = useRef<HTMLVideoElement | null>(null);
  const up = useRef<tus.Upload | null>(null);
  const pathRef = useRef("");

  useEffect(() => () => { stream.current?.getTracks().forEach((t) => t.stop()); up.current?.abort(); }, []);
  useEffect(() => { if (!recording) return; const t = setInterval(() => setSeconds((s) => s + 1), 1000); return () => clearInterval(t); }, [recording]);

  function setFile(b: Blob) { setBlob(b); setPreview(URL.createObjectURL(b)); setPct(null); setErr(null); }

  async function startRec() {
    try {
      const s = await navigator.mediaDevices.getUserMedia(kind === "video" ? { audio: true, video: { facingMode: "user" } } : { audio: true });
      stream.current = s;
      if (live.current && kind === "video") { live.current.srcObject = s; void live.current.play(); }
      const chunks: Blob[] = [];
      const r = new MediaRecorder(s);
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => { s.getTracks().forEach((t) => t.stop()); setFile(new Blob(chunks, { type: r.mimeType || (kind === "video" ? "video/webm" : "audio/webm") })); };
      r.start(1000); rec.current = r; setSeconds(0); setRecording(true); setBlob(null); setPreview(null);
    } catch { toast.error(kind === "video" ? "Autorisez la caméra et le micro pour enregistrer." : "Autorisez le micro pour enregistrer."); }
  }
  function stopRec() { rec.current?.stop(); setRecording(false); }

  async function send() {
    if (!blob) return;
    setErr(null); setPct(0); setPaused(false);
    const ext = (blob.type.split("/")[1] || "webm").split(";")[0].replace("mpeg", "mp3").replace("quicktime", "mov");
    pathRef.current = `${learnerId}/${lessonId}/${Date.now()}.${ext}`;
    try {
      up.current = await startRwUpload({
        file: blob, path: pathRef.current, onProgress: setPct,
        onError: (m) => { setErr(m); setPaused(true); },
        onDone: async () => {
          const { error } = await supabase.from("rw_submissions").insert({
            learner_id: learnerId, lesson_id: lessonId, kind, storage_path: pathRef.current,
            mime_type: blob.type, size_bytes: blob.size, learner_note: note.trim() || null,
          });
          if (error) { setErr("Envoi reçu mais non enregistré. Réessayez."); return; }
          toast.success("Lecture envoyée à votre coach.");
          setBlob(null); setPreview(null); setPct(null); setNote("");
          qc.invalidateQueries({ queryKey: ["rw-my-submissions"] });
        },
      });
    } catch (e) { setErr(e instanceof Error ? e.message : "Envoi impossible."); setPct(null); }
  }
  function togglePause() {
    if (!up.current) return;
    if (paused) { setErr(null); up.current.start(); setPaused(false); } else { void up.current.abort(); setPaused(true); }
  }

  const mm = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const busy = pct !== null;
  return (
    <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-[var(--rw-shadow)]">
      <div>
        <h3 className="text-xl font-bold">Envoyer ma lecture</h3>
        <p className="text-sm text-muted-foreground">Lisez le texte à voix haute, puis envoyez votre enregistrement à votre coach.</p>
      </div>
      <div className="inline-flex rounded-full border border-border p-1">
        {(["audio", "video"] as Kind[]).map((k) => (
          <button key={k} type="button" disabled={recording || busy} onClick={() => { setKind(k); setBlob(null); setPreview(null); }}
            className={cn("flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold", kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
            {k === "audio" ? <Mic className="size-4" /> : <Video className="size-4" />}{k === "audio" ? "Audio" : "Vidéo"}
          </button>
        ))}
      </div>

      {kind === "video" && recording && <video ref={live} muted playsInline className="aspect-video w-full rounded-2xl bg-muted object-cover" />}
      {kind === "video" && !recording && <video ref={live} className="hidden" />}

      {!busy && (
        <div className="flex flex-wrap items-center gap-3">
          {recording ? (
            <Button variant="destructive" onClick={stopRec}><Square className="mr-2 size-4" />Arrêter · {mm}</Button>
          ) : (
            <Button onClick={startRec}><Circle className="mr-2 size-4 fill-current" />{blob ? "Recommencer" : "Enregistrer"}</Button>
          )}
          {!recording && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
              <Upload className="size-4" />Choisir un fichier
              <input type="file" accept={kind === "video" ? "video/*" : "audio/*"} className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { if (f.size > 200 * 1024 * 1024) toast.error("200 Mo maximum."); else setFile(f); } e.target.value = ""; }} />
            </label>
          )}
          {recording && <span className="flex items-center gap-2 text-sm text-destructive"><span className="size-2 animate-pulse rounded-full bg-destructive" />Enregistrement en cours</span>}
        </div>
      )}

      {preview && (kind === "video"
        ? <video src={preview} controls playsInline className="aspect-video w-full rounded-2xl bg-muted" />
        : <audio src={preview} controls className="w-full" />)}

      {blob && !busy && (
        <>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Un message pour votre coach (facultatif)" maxLength={500} />
          <Button onClick={send}><Send className="mr-2 size-4" />Envoyer ({(blob.size / 1024 / 1024).toFixed(1)} Mo)</Button>
        </>
      )}

      {busy && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span>{paused ? "Envoi en pause" : "Envoi en cours…"}</span><span className="font-semibold">{pct}%</span></div>
          <Progress value={pct ?? 0} />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button size="sm" variant="outline" onClick={togglePause}>{paused ? <><Play className="mr-1.5 size-4" />Reprendre</> : <><Pause className="mr-1.5 size-4" />Pause</>}</Button>
          {paused && <Button size="sm" variant="ghost" className="ml-2" onClick={() => { setPct(null); setErr(null); }}><RotateCcw className="mr-1.5 size-4" />Annuler</Button>}
        </div>
      )}
    </section>
  );
}
