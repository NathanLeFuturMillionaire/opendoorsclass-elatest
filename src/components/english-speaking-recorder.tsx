import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Mic, Square, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { beginSpeakingCapture, type SpeakingCapture } from "@/lib/speaking-capture";
import { prepareSpeakingRecording } from "@/lib/speaking-recordings.functions";
import { transcribeAndScoreSpeaking } from "@/lib/test.functions";
import { SpeakingPlayback } from "./speaking-playback";

type State = "ready" | "starting" | "recording" | "stopping" | "saving" | "processing" | "saved" | "error";
type Saved = { recordingId?: string; transcript: string; score: number; feedback?: string };

export function EnglishSpeakingRecorder({ sessionId, questionId, existing, onScored, onSkip, onBusyChange, registerFinish }: {
  sessionId: string; questionId: string; existing?: string; onScored: (value: string) => void;
  onSkip: () => void; onBusyChange: (busy: boolean) => void;
  registerFinish: (finish: (() => Promise<string | undefined>) | null) => void;
}) {
  const prepare = useServerFn(prepareSpeakingRecording);
  const grade = useServerFn(transcribeAndScoreSpeaking);
  const [state, setState] = useState<State>("ready");
  const [level, setLevel] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string>();
  const [localUrl, setLocalUrl] = useState<string>();
  const [recordingId, setRecordingId] = useState<string>();
  const capture = useRef<SpeakingCapture>();
  const audio = useRef<Blob>();
  const uploaded = useRef<string>();
  const urlRef = useRef<string>();
  const stateRef = useRef<State>("ready");
  const mounted = useRef(true);
  const work = useRef<Promise<string | undefined> | undefined>(undefined);
  const callbacks = useRef({ onScored, onBusyChange, registerFinish });
  callbacks.current = { onScored, onBusyChange, registerFinish };
  let parsed: Saved | undefined;
  try { if (existing) parsed = JSON.parse(existing) as Saved; } catch { /* old answer */ }
  const busy = ["starting", "recording", "stopping", "saving", "processing"].includes(state);
  const transition = (next: State) => { stateRef.current = next; if (mounted.current) setState(next); callbacks.current.onBusyChange(["starting", "recording", "stopping", "saving", "processing"].includes(next)); };

  async function send(): Promise<string | undefined> {
    if (!audio.current) return undefined;
    try {
      if (!uploaded.current) {
        transition("saving");
        const ticket = await prepare({ data: { sessionId, questionId } });
        const { error: uploadError } = await supabase.storage.from("speaking-recordings").uploadToSignedUrl(ticket.path, ticket.token, audio.current, { contentType: "audio/wav" });
        if (uploadError) throw new Error("Sauvegarde audio échouée. Votre enregistrement reste disponible ici pour réessayer.");
        uploaded.current = ticket.recordingId;
        if (mounted.current) setRecordingId(ticket.recordingId);
      }
      transition("processing");
      const result = await grade({ data: { recordingId: uploaded.current } });
      const raw = JSON.stringify(result);
      callbacks.current.onScored(raw);
      transition("saved");
      return raw;
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Transcription impossible.");
      transition("error");
      return undefined;
    }
  }

  async function finish(): Promise<string | undefined> {
    if (work.current) return work.current;
    const task = async () => {
      if (capture.current) {
        transition("stopping");
        try {
          audio.current = await capture.current.stop();
          capture.current = undefined;
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = URL.createObjectURL(audio.current);
          if (mounted.current) { setLocalUrl(urlRef.current); setLevel(0); }
        } catch (e) {
          if (mounted.current) setError(e instanceof Error ? e.message : "Enregistrement échoué.");
          transition("error"); return undefined;
        }
      }
      return send();
    };
    work.current = task();
    try { return await work.current; } finally { work.current = undefined; }
  }
  const finishRef = useRef(finish); finishRef.current = finish;
  useEffect(() => {
    mounted.current = true;
    callbacks.current.registerFinish(() => finishRef.current());
    const leave = (event: BeforeUnloadEvent) => {
      if (stateRef.current !== "ready" && stateRef.current !== "saved") { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", leave);
    return () => {
      mounted.current = false;
      callbacks.current.registerFinish(null);
      callbacks.current.onBusyChange(false);
      void capture.current?.cancel();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      window.removeEventListener("beforeunload", leave);
    };
  }, []);
  useEffect(() => {
    if (state !== "recording") return;
    const start = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(timer);
  }, [state]);

  async function start() {
    if (busy) return;
    setError(undefined); transition("starting");
    try {
      capture.current = await beginSpeakingCapture((value) => { if (mounted.current) setLevel(value); }, () => {
        if (mounted.current) setError("Le microphone a été interrompu. La partie enregistrée sera conservée.");
        void finishRef.current();
      });
      if (!mounted.current) { await capture.current.cancel(); return; }
      audio.current = undefined; uploaded.current = undefined; setRecordingId(undefined);
      setSeconds(0); transition("recording");
    } catch (e) {
      const name = (e as { name?: string }).name;
      setError(name === "NotAllowedError" ? "Accès au microphone refusé. Autorisez le microphone puis réessayez." : name === "NotFoundError" ? "Aucun microphone détecté." : name === "NotReadableError" ? "Microphone inaccessible, vérifiez qu’il n’est pas utilisé par une autre application." : e instanceof Error ? e.message : "Enregistrement impossible.");
      transition("error");
    }
  }
  const status = state === "starting" ? "Activation du microphone..." : state === "recording" ? `Microphone actif, enregistrement ${seconds}s` : state === "stopping" ? "Arrêt et finalisation de l’audio..." : state === "saving" ? "Sauvegarde de l’audio original..." : state === "processing" ? "Audio sauvegardé, transcription et analyse en cours..." : state === "saved" ? "Réponse et audio enregistrés" : state === "error" ? "Réponse à vérifier" : "Prêt à enregistrer";
  return <div className="space-y-4">
    <div className="rounded-lg border border-border bg-muted/40 p-5">
      <div className="flex h-16 items-center justify-center gap-1" aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => <span key={i} className={`inline-block w-1.5 rounded-full transition-all ${state === "recording" ? "bg-primary" : "bg-muted-foreground/30"}`} style={{ height: `${state === "recording" ? Math.max(6, level * 60 * (0.4 + Math.abs(Math.sin(i)) * 0.6)) : 6}px` }} />)}
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-center text-sm text-muted-foreground">{status}</p>
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {state === "recording" ? <Button variant="destructive" onClick={() => void finish()}><Square className="mr-2 size-4" />Arrêter</Button> : <Button onClick={() => void start()} disabled={busy || !!audio.current && state === "error"} className="bg-brand-gradient text-primary-foreground">{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Mic className="mr-2 size-4" />}{busy ? "Traitement..." : parsed || localUrl ? "Réenregistrer" : "Commencer à parler"}</Button>}
        {state === "error" && audio.current ? <Button variant="outline" onClick={() => { setError(undefined); void finish(); }}>Réessayer l’envoi</Button> : null}
      </div>
      {!busy ? <div className="mt-3 text-center"><Button variant="ghost" size="sm" onClick={onSkip}>Ignorer ce passage</Button></div> : null}
      {localUrl ? <audio aria-label="Réécouter mon enregistrement" src={localUrl} controls className="mt-4 w-full" /> : null}
      {recordingId && state === "error" ? <div className="mt-3"><SpeakingPlayback recordingId={recordingId} /></div> : null}
    </div>
    {parsed && !busy ? <div className="space-y-2 rounded-lg border border-border bg-card p-4 text-sm">
      <div className="flex items-center justify-between gap-2"><span className="font-medium">Note IA : {parsed.score}/100</span><Badge variant={parsed.score >= 60 ? "secondary" : "outline"}>{parsed.score >= 60 ? "Validé" : "À améliorer"}</Badge></div>
      {parsed.recordingId ? <p className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="size-4 text-primary" />Audio original conservé</p> : null}
      {parsed.feedback ? <p className="text-xs text-muted-foreground">{parsed.feedback}</p> : null}
      <details><summary className="cursor-pointer text-xs text-muted-foreground">Voir la transcription finale</summary><p className="mt-2 whitespace-pre-wrap">{parsed.transcript}</p></details>
      {parsed.recordingId && !localUrl ? <SpeakingPlayback recordingId={parsed.recordingId} /> : null}
    </div> : null}
  </div>;
}