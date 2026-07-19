import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Clock, Headphones, Loader2, Mic, Play, Square } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getTestQuestions,
  startTestSession,
  submitTestAnswers,
  transcribeAndScoreSpeaking,
  type ClientQuestion,
} from "@/lib/test.functions";

export const Route = createFileRoute("/_authenticated/test")({
  component: TestPage,
});

const TEST_DURATION_SEC = 30 * 60;

type Phase = "intro" | "listening-intro" | "speaking-intro" | "running" | "submitting";

function TestPage() {
  const navigate = useNavigate();
  const fetchQuestions = useServerFn(getTestQuestions);
  const startSession = useServerFn(startTestSession);
  const submit = useServerFn(submitTestAnswers);

  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(TEST_DURATION_SEC);
  const [loading, setLoading] = useState(false);
  const [seenListeningIntro, setSeenListeningIntro] = useState(false);
  const [seenSpeakingIntro, setSeenSpeakingIntro] = useState(false);

  const startTest = async () => {
    setLoading(true);
    try {
      const [qs, session] = await Promise.all([fetchQuestions(), startSession()]);
      if (!qs.length) throw new Error("Aucune question disponible pour le moment.");
      setQuestions(qs);
      setSessionId(session.sessionId);
      setCurrent(0);
      setPhase("running");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("INSUFFICIENT_CREDITS")) {
        toast.error("Vous n'avez plus de crédits. Redirection vers l'achat.");
        navigate({ to: "/achat-credits" });
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const doSubmit = async (finalAnswers: Record<string, string>) => {
    if (!sessionId) return;
    setPhase("submitting");
    try {
      await submit({ data: { sessionId, answers: finalAnswers } });
      navigate({ to: "/resultat/$id", params: { id: sessionId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'envoi.");
      setPhase("running");
    }
  };

  // Timer
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          void doSubmit(answers);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const q = questions[current];

  // Trigger listening intro on first listening question.
  useEffect(() => {
    if (phase === "running" && q?.category === "listening" && !seenListeningIntro) {
      setPhase("listening-intro");
    }
    if (phase === "running" && q?.category === "speaking" && !seenSpeakingIntro) {
      setPhase("speaking-intro");
    }
  }, [phase, q, seenListeningIntro, seenSpeakingIntro]);

  const goto = (delta: number) => {
    setCurrent((c) => Math.min(Math.max(0, c + delta), questions.length - 1));
  };

  const setAnswer = (val: string) => {
    if (!q) return;
    setAnswers((a) => ({ ...a, [q.id]: val }));
  };

  if (phase === "intro") {
    return (
      <Shell>
        <Card className="mx-auto max-w-2xl">
          <CardContent className="p-8 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Test de niveau OpenDoorsClass</h1>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Durée : 30 minutes, chronométrées.</li>
              <li>Questions à choix multiples, difficulté croissante (A1 à C2).</li>
              <li>Une section de compréhension orale avec un audio à écouter (5 écoutes maximum par question).</li>
              <li>Un crédit sera décompté au démarrage du test.</li>
            </ul>
            <div className="rounded-lg bg-muted/60 p-4 text-sm">
              Astuce : installez-vous au calme et gardez vos écouteurs à portée de main pour la partie audio.
            </div>
            <Button
              size="lg"
              onClick={startTest}
              disabled={loading}
              className="w-full bg-brand-gradient text-primary-foreground"
            >
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Démarrer le test
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (phase === "listening-intro") {
    return (
      <Shell>
        <Card className="mx-auto max-w-2xl">
          <CardContent className="p-8 space-y-6 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
              <Headphones className="size-8" />
            </div>
            <h2 className="text-2xl font-bold">Section compréhension orale</h2>
            <p className="text-muted-foreground">
              Nous vous recommandons d'utiliser des écouteurs pour une meilleure qualité d'écoute.
              Ce n'est pas obligatoire.
            </p>
            <p className="text-sm text-muted-foreground">
              Vous pouvez écouter chaque audio 5 fois au maximum. Le compteur d'écoutes est affiché à côté du lecteur.
            </p>
            <Button
              size="lg"
              onClick={() => {
                setSeenListeningIntro(true);
                setPhase("running");
              }}
              className="bg-brand-gradient text-primary-foreground"
            >
              Je suis prêt
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (phase === "speaking-intro") {
    return (
      <Shell>
        <Card className="mx-auto max-w-2xl">
          <CardContent className="p-8 space-y-6 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
              <Mic className="size-8" />
            </div>
            <h2 className="text-2xl font-bold">Section expression orale</h2>
            <p className="text-muted-foreground">
              Vous allez répondre en anglais à voix haute. Autorisez l'accès au microphone,
              parlez clairement, puis arrêtez l'enregistrement. Votre réponse sera
              transcrite et notée automatiquement par l'IA.
            </p>
            <p className="text-sm text-muted-foreground">
              Astuce : un environnement calme améliore la précision de la transcription.
            </p>
            <Button
              size="lg"
              onClick={() => {
                setSeenSpeakingIntro(true);
                setPhase("running");
              }}
              className="bg-brand-gradient text-primary-foreground"
            >
              Je suis prêt
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (phase === "submitting" || !q) {
    return (
      <Shell>
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Correction de votre test en cours...</p>
        </div>
      </Shell>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const progress = ((current + 1) / questions.length) * 100;

  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Question {current + 1} / {questions.length}</Badge>
            <Badge className="bg-primary/10 text-primary" variant="secondary">{q.level}</Badge>
            <Badge variant="secondary" className="capitalize">{q.category}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock className="size-4" />
            <span>{formatTime(remaining)}</span>
          </div>
        </div>
        <Progress value={progress} />

        <Card>
          <CardContent className="p-6 space-y-5">
            {q.audio_url ? <AudioPlayer key={q.id} url={q.audio_url} maxPlays={q.max_plays} /> : null}
            <h2 className="text-lg font-semibold leading-relaxed">{q.question_text}</h2>
            {q.category === "speaking" ? (
              <SpeakingRecorder
                key={q.id}
                sessionId={sessionId!}
                questionId={q.id}
                existing={answers[q.id]}
                onScored={(value) => setAnswers((a) => ({ ...a, [q.id]: value }))}
              />
            ) : (
            <RadioGroup
              value={answers[q.id] ?? ""}
              onValueChange={setAnswer}
              className="space-y-2"
            >
              {q.options.map((opt, i) => {
                const id = `${q.id}-${i}`;
                return (
                  <Label
                    key={id}
                    htmlFor={id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                  >
                    <RadioGroupItem id={id} value={opt} />
                    <span className="text-sm">{opt}</span>
                  </Label>
                );
              })}
            </RadioGroup>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => goto(-1)} disabled={current === 0}>
            <ArrowLeft className="mr-2 size-4" /> Précédent
          </Button>
          <span className="text-xs text-muted-foreground">
            {answeredCount} / {questions.length} répondues
          </span>
          {current < questions.length - 1 ? (
            <Button onClick={() => goto(1)} className="bg-brand-gradient text-primary-foreground">
              Suivant <ArrowRight className="ml-2 size-4" />
            </Button>
          ) : (
            <Button
              onClick={() => void doSubmit(answers)}
              className="bg-brand-gradient text-primary-foreground"
            >
              Terminer et voir mon niveau
            </Button>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 px-4 py-8 sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function AudioPlayer({ url, maxPlays }: { url: string; maxPlays: number }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const remaining = maxPlays - plays;

  const play = () => {
    if (remaining <= 0) return;
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    void a.play();
    setPlaying(true);
    setPlays((p) => p + 1);
  };

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Headphones className="size-4 text-primary" />
          Audio
        </div>
        <span className="text-xs text-muted-foreground">
          Écoutes restantes : {remaining} / {maxPlays}
        </span>
      </div>
      <audio
        ref={audioRef}
        src={url}
        preload="none"
        onEnded={() => setPlaying(false)}
        className="mt-3 w-full"
        controls
        controlsList="nodownload noplaybackrate"
      />
      <div className="mt-3 flex justify-center">
        <Button
          type="button"
          onClick={play}
          disabled={remaining <= 0 || playing}
          variant="outline"
          size="sm"
        >
          <Play className="mr-2 size-4" />
          {playing ? "Lecture en cours..." : remaining > 0 ? "Écouter" : "Plus d'écoutes"}
        </Button>
      </div>
    </div>
  );
}
function SpeakingRecorder({
  sessionId,
  questionId,
  existing,
  onScored,
}: {
  sessionId: string;
  questionId: string;
  existing?: string;
  onScored: (value: string) => void;
}) {
  const scoreFn = useServerFn(transcribeAndScoreSpeaking);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [level, setLevel] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const parsed = (() => {
    if (!existing) return null;
    try {
      const p = JSON.parse(existing) as { transcript: string; score: number; feedback?: string };
      return p;
    } catch { return null; }
  })();

  const stopAll = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime =
        MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" :
        MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const type = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        stopAll();
        setLevel(0);
        setRecording(false);
        if (blob.size < 2048) {
          toast.error("Enregistrement trop court, réessayez.");
          return;
        }
        setProcessing(true);
        try {
          const arrayBuf = await blob.arrayBuffer();
          // base64
          let binary = "";
          const bytes = new Uint8Array(arrayBuf);
          const chunk = 0x8000;
          for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]);
          }
          const b64 = btoa(binary);
          const res = await scoreFn({
            data: { sessionId, questionId, audioBase64: b64, mimeType: type },
          });
          onScored(JSON.stringify(res));
          toast.success(`Réponse notée : ${res.score}/100`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Erreur transcription.");
        } finally {
          setProcessing(false);
        }
      };
      rec.start();
      mediaRef.current = rec;

      // Audio analyser for waveform
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        setLevel(Math.min(1, rms * 3));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setRecording(true);
    } catch {
      toast.error("Accès au micro refusé.");
    }
  };

  const stop = () => {
    mediaRef.current?.state === "recording" && mediaRef.current.stop();
  };

  useEffect(() => () => stopAll(), []);

  // 10 animated bars driven by level + slight jitter per bar
  const bars = Array.from({ length: 18 }, (_, i) => {
    const jitter = 0.35 + Math.abs(Math.sin((Date.now() / 120) + i)) * 0.65;
    const h = recording ? Math.max(6, level * 60 * jitter + 6) : 6;
    return h;
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/40 p-5">
        <div className="flex h-16 items-center justify-center gap-1">
          {bars.map((h, i) => (
            <span
              key={i}
              className={`inline-block w-1.5 rounded-full transition-all duration-100 ${recording ? "bg-primary" : "bg-muted-foreground/30"}`}
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{recording ? `Enregistrement... ${seconds}s` : processing ? "Analyse IA en cours..." : "Prêt à enregistrer"}</span>
          <span>Micro requis</span>
        </div>
        <div className="mt-4 flex justify-center">
          {!recording ? (
            <Button type="button" onClick={start} disabled={processing} className="bg-brand-gradient text-primary-foreground">
              {processing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Mic className="mr-2 size-4" />}
              {processing ? "Traitement..." : parsed ? "Réenregistrer" : "Commencer à parler"}
            </Button>
          ) : (
            <Button type="button" onClick={stop} variant="destructive">
              <Square className="mr-2 size-4" /> Arrêter
            </Button>
          )}
        </div>
      </div>

      {parsed && !recording && !processing && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Note IA : {parsed.score}/100</span>
            <Badge variant={parsed.score >= 60 ? "secondary" : "outline"}>
              {parsed.score >= 60 ? "Validé" : "À améliorer"}
            </Badge>
          </div>
          {parsed.feedback ? <p className="text-xs text-muted-foreground">{parsed.feedback}</p> : null}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Voir la transcription</summary>
            <p className="mt-2 whitespace-pre-wrap">{parsed.transcript || "(aucune parole détectée)"}</p>
          </details>
        </div>
      )}
    </div>
  );
}
