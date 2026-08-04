import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Clock, Headphones, Loader2, Mic, MicOff, Play, Square, CheckCircle2, AlertTriangle } from "lucide-react";
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
  scoreWritingAnswer,
  type ClientQuestion,
} from "@/lib/test.functions";
import {
  TEST_INTROS,
  SECTION_ENCOURAGEMENTS,
  SKILL_LABELS,
  pickRandom,
  type Skill,
} from "@/lib/test-engine";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/test")({
  component: TestPage,
});

const TEST_DURATION_SEC = 30 * 60;

type Phase = "intro" | "listening-intro" | "speaking-intro" | "running" | "submitting";

function TestPage() {
  const navigate = useNavigate();
  const { locale } = useI18n();
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
  const [sectionMessage, setSectionMessage] = useState<string | null>(null);
  const [fadeKey, setFadeKey] = useState(0);
  const introVariant = useMemo(() => pickRandom(TEST_INTROS), []);
  const introText = locale === "en" ? introVariant.en : introVariant.fr;

  const startTest = async () => {
    setLoading(true);
    try {
      const session = await startSession();
      const qs = await fetchQuestions({ data: { sessionId: session.sessionId } });
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

  // Encouragement between two skills, plus a soft transition on each question.
  const prevSkillRef = useRef<string | null>(null);
  useEffect(() => {
    if (phase !== "running" || !q) return;
    setFadeKey((k) => k + 1);
    if (prevSkillRef.current && prevSkillRef.current !== q.category) {
      const enc = pickRandom(SECTION_ENCOURAGEMENTS);
      setSectionMessage(locale === "en" ? enc.en : enc.fr);
      const t = setTimeout(() => setSectionMessage(null), 2600);
      prevSkillRef.current = q.category;
      return () => clearTimeout(t);
    }
    prevSkillRef.current = q.category;
  }, [phase, q?.id]);

  // Preload only the next question resources.
  useEffect(() => {
    const next = questions[current + 1];
    if (!next) return;
    if (next.image_url) {
      const img = new Image();
      img.src = next.image_url;
    }
  }, [current, questions]);

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
        <Card className="mx-auto max-w-2xl animate-fade-in border-primary/20 shadow-xl">
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
                Évaluation officielle
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight">Avant de commencer</h1>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card p-5 text-sm leading-relaxed text-foreground/90">
              <p className="font-semibold text-foreground">
                Bienvenue dans l'évaluation officielle OpenDoorsClass.
              </p>
              <p className="mt-3 italic text-foreground/80">{introText}</p>
              <p className="mt-3">
                Afin de garantir l'intégrité de votre résultat, un système de
                détection des tentatives de fraude est actif pendant toute la durée
                du test. Veuillez rester concentré et éviter de quitter votre
                navigateur ou de changer d'onglet de manière répétée.
              </p>
              <p className="mt-3">
                Toute activité suspecte pourra entraîner l'annulation automatique
                de votre session et engendre la perte de votre crédit.
              </p>
              <p className="mt-3">
                Nous vous recommandons de prévoir un environnement calme, une
                connexion Internet stable et de consacrer toute votre attention à
                cette évaluation.
              </p>
              <p className="mt-3 font-semibold text-primary">
                Nous vous souhaitons pleine réussite. Bonne chance !
              </p>
            </div>
            <ul className="space-y-2 rounded-xl bg-muted/50 p-4 text-xs text-muted-foreground">
              <li>· Durée : 30 minutes, chronométrées.</li>
              <li>· Questions à choix multiples, difficulté croissante (A1 à C2).</li>
              <li>· Section audio, 5 écoutes maximum par question, écouteurs recommandés.</li>
              <li>· Un crédit sera décompté au démarrage.</li>
            </ul>
            <Button
              size="lg"
              onClick={startTest}
              disabled={loading}
              className="w-full bg-brand-gradient text-primary-foreground hover-scale"
            >
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Je comprends et je commence mon test
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
        <MicCheck
          onReady={() => {
            setSeenSpeakingIntro(true);
            setPhase("running");
          }}
        />
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
  const skillLabel =
    (locale === "en"
      ? SKILL_LABELS[q.category as Skill]?.en
      : SKILL_LABELS[q.category as Skill]?.fr) ?? q.category;

  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Question {current + 1} / {questions.length}</Badge>
            <Badge className="bg-primary/10 text-primary" variant="secondary">{q.level}</Badge>
            <Badge variant="secondary">{skillLabel}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock className="size-4" />
            <span>{formatTime(remaining)}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand-gradient transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{Math.round(progress)} % du parcours</span>
            <span>{answeredCount} / {questions.length} répondues</span>
          </div>
        </div>

        {sectionMessage ? (
          <div className="animate-fade-in rounded-xl border border-primary/25 bg-primary/5 px-4 py-2.5 text-center text-sm font-medium text-primary">
            {sectionMessage}
          </div>
        ) : null}

        <Card key={fadeKey} className="animate-fade-in">
          <CardContent className="p-6 space-y-5">
            {q.audio_url ? <AudioPlayer key={q.id} url={q.audio_url} maxPlays={q.max_plays} /> : null}
            {q.image_url ? (
              <img
                src={q.image_url}
                alt={q.image_alt ?? "Illustration de la question"}
                loading="lazy"
                decoding="async"
                className="mx-auto max-h-64 w-full rounded-xl border border-border object-contain sm:max-h-80"
              />
            ) : null}
            <h2 className="text-lg font-semibold leading-relaxed">{q.question_text}</h2>
            {q.category === "speaking" ? (
              <SpeakingRecorder
                key={q.id}
                sessionId={sessionId!}
                questionId={q.id}
                existing={answers[q.id]}
                onScored={(value) => setAnswers((a) => ({ ...a, [q.id]: value }))}
              />
            ) : q.category === "writing" ? (
              <WritingAnswer
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
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-all duration-200 hover:bg-muted active:scale-[0.99] has-[[data-state=checked]]:scale-[1.01] has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 has-[[data-state=checked]]:shadow-sm"
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
          <span className="hidden text-xs text-muted-foreground sm:inline">{skillLabel}</span>
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
  const [liveTranscript, setLiveTranscript] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<unknown>(null);

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
    try {
      const r = recognitionRef.current as { stop?: () => void } | null;
      r?.stop?.();
    } catch { /* noop */ }
    recognitionRef.current = null;
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
      setLiveTranscript("");
      // Live transcription via Web Speech API when available (Chrome/Edge/Safari).
      try {
        const w = window as unknown as {
          SpeechRecognition?: new () => unknown;
          webkitSpeechRecognition?: new () => unknown;
        };
        const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
        if (SR) {
          const rec = new SR() as {
            continuous: boolean;
            interimResults: boolean;
            lang: string;
            onresult: (e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void;
            onerror: () => void;
            start: () => void;
          };
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = "en-US";
          let finalText = "";
          rec.onresult = (e) => {
            let interim = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const r = e.results[i];
              const txt = r[0]?.transcript ?? "";
              if (r.isFinal) finalText += txt + " ";
              else interim += txt;
            }
            setLiveTranscript((finalText + interim).trim());
          };
          rec.onerror = () => { /* silent, fallback to server STT */ };
          rec.start();
          recognitionRef.current = rec;
        }
      } catch { /* live transcription optional */ }
    } catch (err) {
      const name = (err as { name?: string })?.name ?? "";
      const msg =
        name === "NotAllowedError" || name === "SecurityError"
          ? "Accès au microphone refusé. Cliquez sur l'icône microphone dans la barre d'adresse de votre navigateur pour autoriser l'accès, puis réessayez."
          : name === "NotFoundError"
            ? "Aucun microphone détecté sur cet appareil."
            : name === "NotReadableError"
              ? "Votre microphone est peut-être utilisé par une autre application. Fermez-la et réessayez."
              : name === "OverconstrainedError"
                ? "Aucun microphone compatible n'a été trouvé."
                : "Impossible d'accéder au microphone.";
      toast.error(msg);
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
        {recording && liveTranscript ? (
          <div className="mt-3 rounded-md bg-background/70 p-3 text-sm italic text-foreground/80">
            "{liveTranscript}"
          </div>
        ) : null}
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

function MicCheck({ onReady }: { onReady: () => void }) {
  const [step, setStep] = useState<"prompt" | "granted" | "denied">("prompt");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const [peak, setPeak] = useState(0);

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
  };

  useEffect(() => () => cleanup(), []);

  const requestMic = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.min(1, Math.sqrt(sum / buf.length) * 4);
        setLevel(rms);
        setPeak((p) => Math.max(p, rms));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      setStep("granted");
    } catch (err) {
      const name = (err as { name?: string })?.name ?? "";
      const msg =
        name === "NotAllowedError" || name === "SecurityError"
          ? "Accès refusé. Cliquez sur l'icône microphone dans la barre d'adresse de votre navigateur, autorisez l'accès, puis réessayez."
          : name === "NotFoundError"
            ? "Aucun microphone détecté sur cet appareil."
            : name === "NotReadableError"
              ? "Votre microphone est peut-être utilisé par une autre application. Fermez-la et réessayez."
              : "Impossible d'accéder au microphone.";
      setError(msg);
      setStep("denied");
    }
  };

  const proceed = () => {
    cleanup();
    onReady();
  };

  return (
    <Card className="mx-auto max-w-2xl animate-fade-in border-primary/20 shadow-xl">
      <CardContent className="p-8 space-y-6">
        <div className="text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
            <Mic className="size-8" />
          </div>
          <h2 className="mt-4 text-2xl font-bold">Vérification du microphone</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            La section expression orale requiert votre microphone. Effectuons un rapide test.
          </p>
        </div>

        {step === "prompt" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              OpenDoorsClass a besoin d'accéder à votre microphone pour le Speaking Test.
              Aucun enregistrement ne quittera votre navigateur avant le début de l'épreuve.
            </div>
            <Button size="lg" onClick={requestMic} className="w-full bg-brand-gradient text-primary-foreground">
              <Mic className="mr-2 size-4" /> Autoriser le microphone
            </Button>
          </div>
        )}

        {step === "granted" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
              Microphone connecté avec succès.
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Niveau audio, parlez pour tester :</p>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand-gradient transition-all duration-75"
                  style={{ width: `${Math.round(level * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {peak > 0.08
                  ? "Votre microphone capte bien le son."
                  : "Parlez à voix normale pour vérifier la captation."}
              </p>
            </div>
            <Button
              size="lg"
              onClick={proceed}
              disabled={peak < 0.05}
              className="w-full bg-brand-gradient text-primary-foreground disabled:opacity-60"
            >
              {peak < 0.05 ? "En attente d'un son détecté..." : "Démarrer le Speaking Test"}
            </Button>
          </div>
        )}

        {step === "denied" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <MicOff className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-semibold">Microphone indisponible</p>
                <p className="mt-1 text-destructive/90">{error}</p>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1 font-medium text-foreground">
                <AlertTriangle className="size-4" /> Guide rapide
              </p>
              <p>Chrome / Edge : cliquez sur l'icône cadenas ou microphone à gauche de la barre d'adresse, puis autorisez le microphone.</p>
              <p>Firefox : cliquez sur l'icône microphone dans la barre d'adresse, puis choisissez « Autoriser ».</p>
              <p>Safari : Réglages Safari, Sites Web, Microphone, autorisez ce site.</p>
            </div>
            <Button size="lg" onClick={requestMic} className="w-full bg-brand-gradient text-primary-foreground">
              Réessayer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WritingAnswer({
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
  const scoreFn = useServerFn(scoreWritingAnswer);
  const parsed = (() => {
    if (!existing) return null;
    try {
      return JSON.parse(existing) as { text: string; score: number; feedback?: string };
    } catch {
      return null;
    }
  })();
  const [text, setText] = useState(parsed?.text ?? "");
  const [saving, setSaving] = useState(false);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const submitText = async () => {
    if (words < 5) {
      toast.error("Votre réponse est trop courte.");
      return;
    }
    setSaving(true);
    try {
      const res = await scoreFn({ data: { sessionId, questionId, text } });
      onScored(JSON.stringify({ text, ...res }));
      toast.success(`Réponse notée : ${res.score}/100`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la correction.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        placeholder="Write your answer in English..."
        className="resize-y"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">{words} mots</span>
        <Button type="button" onClick={submitText} disabled={saving} className="bg-brand-gradient text-primary-foreground">
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {parsed ? "Corriger à nouveau" : "Valider ma réponse"}
        </Button>
      </div>
      {parsed && !saving ? (
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">Note IA : {parsed.score}/100</span>
            <Badge variant={parsed.score >= 60 ? "secondary" : "outline"}>
              {parsed.score >= 60 ? "Validé" : "À améliorer"}
            </Badge>
          </div>
          {parsed.feedback ? (
            <p className="mt-2 text-xs text-muted-foreground">{parsed.feedback}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
