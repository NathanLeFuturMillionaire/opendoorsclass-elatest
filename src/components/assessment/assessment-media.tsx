import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Headphones, Loader2, Mic, Play, Send, Square } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n";
import { scoreAssessmentSpeaking, scoreAssessmentWriting } from "@/lib/assessment.functions";

/** Audio prompt with a hard cap on the number of plays, as in an exam room. */
export function AssessmentAudio({ url, maxPlays }: { url: string; maxPlays: number }) {
  const t = useT();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const remaining = Math.max(0, maxPlays - plays);

  const play = () => {
    const a = audioRef.current;
    if (!a || remaining <= 0) return;
    a.currentTime = 0;
    void a.play();
    setPlaying(true);
    setPlays((p) => p + 1);
  };

  return (
    <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Headphones className="size-4 text-brand-blue" aria-hidden="true" />
          {t("sa.audio.title")}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("sa.audio.plays")} : {remaining} / {maxPlays}
        </span>
      </div>
      <audio
        ref={audioRef}
        src={url}
        preload="none"
        controls
        controlsList="nodownload noplaybackrate"
        onEnded={() => setPlaying(false)}
        className="mt-3 w-full"
      />
      <div className="mt-3 flex justify-center">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={play}
          disabled={remaining <= 0 || playing}
        >
          <Play className="mr-2 size-4" aria-hidden="true" />
          {playing
            ? t("sa.audio.playing")
            : remaining > 0
              ? t("sa.audio.listen")
              : t("sa.audio.none")}
        </Button>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">{t("sa.audio.tip")}</p>
    </div>
  );
}

type Graded = { score: number; feedback?: string; transcript?: string; text?: string } | null;

function parseGraded(value?: string): Graded {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Graded;
    return parsed && typeof parsed.score === "number" ? parsed : null;
  } catch {
    return null;
  }
}

function GradeSummary({ graded }: { graded: NonNullable<Graded> }) {
  const t = useT();
  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-card p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">
          {t("sa.writing.score")} : {graded.score}/100
        </span>
        <Badge variant={graded.score >= 60 ? "secondary" : "outline"}>
          {graded.score >= 60 ? t("sa.grade.ok") : t("sa.grade.ko")}
        </Badge>
      </div>
      {graded.feedback ? <p className="text-xs text-muted-foreground">{graded.feedback}</p> : null}
      {typeof graded.transcript === "string" ? (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">{t("sa.speaking.transcript")}</summary>
          <p className="mt-2 whitespace-pre-wrap">{graded.transcript || "..."}</p>
        </details>
      ) : null}
    </div>
  );
}

/** Free written production, graded by AI against the CEFR descriptors. */
export function AssessmentWriting({
  sessionId,
  questionId,
  value,
  onGraded,
}: {
  sessionId: string;
  questionId: string;
  value?: string;
  onGraded: (raw: string) => void;
}) {
  const t = useT();
  const grade = useServerFn(scoreAssessmentWriting);
  const graded = parseGraded(value);
  const [text, setText] = useState(graded?.text ?? "");
  const [busy, setBusy] = useState(false);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const res = await grade({ data: { sessionId, questionId, text } });
      onGraded(JSON.stringify({ text, ...res }));
      toast.success(`${t("sa.writing.score")} : ${res.score}/100`);
    } catch {
      toast.error(t("sa.grade.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("sa.writing.hint")}</p>
      <Textarea
        lang="es"
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {words} {t("sa.writing.words")}
        </span>
        <Button
          type="button"
          onClick={() => void submit()}
          disabled={busy || !text.trim()}
          className="rounded-xl bg-brand-gradient text-primary-foreground"
        >
          {busy ? (
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="mr-2 size-4" aria-hidden="true" />
          )}
          {busy ? t("sa.writing.grading") : t("sa.writing.submit")}
        </Button>
      </div>
      {graded ? <GradeSummary graded={graded} /> : null}
    </div>
  );
}

/** Spoken production: browser recording, server transcription, AI grading. */
export function AssessmentSpeaking({
  sessionId,
  questionId,
  value,
  onGraded,
  onSkip,
}: {
  sessionId: string;
  questionId: string;
  value?: string;
  onGraded: (raw: string) => void;
  onSkip: () => void;
}) {
  const t = useT();
  const grade = useServerFn(scoreAssessmentSpeaking);
  const graded = parseGraded(value);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
  };

  useEffect(() => () => cleanup(), []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        const type = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        cleanup();
        setLevel(0);
        setRecording(false);
        if (blob.size < 2048) {
          toast.error(t("sa.speaking.short"));
          return;
        }
        setBusy(true);
        try {
          const bytes = new Uint8Array(await blob.arrayBuffer());
          let binary = "";
          const step = 0x8000;
          for (let i = 0; i < bytes.length; i += step) {
            binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + step)));
          }
          const res = await grade({
            data: { sessionId, questionId, audioBase64: btoa(binary), mimeType: type },
          });
          onGraded(JSON.stringify(res));
          toast.success(`${t("sa.writing.score")} : ${res.score}/100`);
        } catch {
          toast.error(t("sa.grade.failed"));
        } finally {
          setBusy(false);
        }
      };
      rec.start();
      mediaRef.current = rec;

      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 3));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setRecording(true);
    } catch {
      toast.error(t("sa.speaking.error"));
    }
  };

  const stop = () => {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-muted/40 p-5">
        <div className="flex h-16 items-center justify-center gap-1" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <span
              key={i}
              className={`inline-block w-1.5 rounded-full transition-all duration-100 ${
                recording ? "bg-brand-blue" : "bg-muted-foreground/30"
              }`}
              style={{
                height: recording
                  ? `${Math.max(6, level * 60 * (0.4 + Math.abs(Math.sin(i)) * 0.6) + 6)}px`
                  : "6px",
              }}
            />
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {recording
            ? `${t("sa.speaking.recording")} ${seconds}s`
            : busy
              ? t("sa.speaking.processing")
              : t("sa.speaking.ready")}
        </p>
        <div className="mt-4 flex justify-center">
          {recording ? (
            <Button type="button" variant="destructive" onClick={stop}>
              <Square className="mr-2 size-4" aria-hidden="true" />
              {t("sa.speaking.stop")}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void start()}
              disabled={busy}
              className="rounded-xl bg-brand-gradient text-primary-foreground"
            >
              {busy ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Mic className="mr-2 size-4" aria-hidden="true" />
              )}
              {graded ? t("sa.speaking.again") : t("sa.speaking.start")}
            </Button>
          )}
        </div>
        {!recording && !busy ? (
          <div className="mt-3 text-center">
            <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
              {t("sa.speaking.skip")}
            </Button>
            <p className="mt-1 text-[11px] text-muted-foreground">{t("sa.speaking.skip.hint")}</p>
          </div>
        ) : null}
      </div>
      {graded ? <GradeSummary graded={graded} /> : null}
    </div>
  );
}
