import { useEffect, useRef, useState } from "react";
import { Maximize, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RATES = [0.75, 1, 1.25, 1.5, 2];
export function fmtTime(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/** Workshop audio/video player: play, seek, 10 s jumps, speed, volume, full screen. */
export function RwMediaPlayer({ src, kind, className }: { src: string; kind: "audio" | "video"; className?: string }) {
  const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [rate, setRate] = useState(1);
  const [vol, setVol] = useState(1);
  const [muted, setMuted] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => { if (ref.current) ref.current.playbackRate = rate; }, [rate]);
  useEffect(() => { if (ref.current) { ref.current.volume = vol; ref.current.muted = muted; } }, [vol, muted]);

  const el = () => ref.current;
  const toggle = () => { const m = el(); if (!m) return; if (m.paused) m.play().catch(() => setErr(true)); else m.pause(); };
  const jump = (d: number) => { const m = el(); if (m) m.currentTime = Math.min(Math.max(0, m.currentTime + d), m.duration || 0); };
  // MediaRecorder files often report Infinity duration until fully scanned.
  const onMeta = () => { const m = el(); if (!m) return; if (m.duration === Infinity) { m.currentTime = 1e9; m.ontimeupdate = () => { m.ontimeupdate = null; m.currentTime = 0; setDur(m.duration); }; } else setDur(m.duration); };

  const common = {
    ref, src, preload: "metadata" as const, playsInline: true,
    onPlay: () => setPlaying(true), onPause: () => setPlaying(false), onEnded: () => setPlaying(false),
    onTimeUpdate: () => setT(el()?.currentTime ?? 0), onLoadedMetadata: onMeta, onDurationChange: () => { const d = el()?.duration; if (d && Number.isFinite(d)) setDur(d); },
    onError: () => setErr(true),
  };

  return (
    <div ref={box} className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)}>
      {kind === "video"
        ? <video {...common} onClick={toggle} className="aspect-video w-full bg-muted object-contain" />
        : <audio {...common} className="hidden" />}
      {err ? <p className="p-3 text-sm text-destructive">Lecture impossible. Vérifiez votre connexion et réessayez.</p> : (
        <div className="space-y-2 p-3">
          <input type="range" aria-label="Position" min={0} max={dur || 0} step={0.1} value={Math.min(t, dur || 0)}
            onChange={(e) => { const m = el(); if (m) m.currentTime = Number(e.target.value); }} className="w-full accent-primary" />
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="icon" variant="ghost" aria-label="Reculer de 10 secondes" onClick={() => jump(-10)}><RotateCcw className="size-4" /></Button>
            <Button size="icon" aria-label={playing ? "Pause" : "Lecture"} onClick={toggle}>{playing ? <Pause className="size-4" /> : <Play className="size-4" />}</Button>
            <Button size="icon" variant="ghost" aria-label="Avancer de 10 secondes" onClick={() => jump(10)}><RotateCw className="size-4" /></Button>
            <span className="text-xs tabular-nums text-muted-foreground">{fmtTime(t)} / {fmtTime(dur)}</span>
            <div className="ml-auto flex items-center gap-1.5">
              <select aria-label="Vitesse" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="rounded-full border border-border bg-background px-2 py-1 text-xs">
                {RATES.map((r) => <option key={r} value={r}>{r}x</option>)}
              </select>
              <Button size="icon" variant="ghost" aria-label={muted ? "Activer le son" : "Couper le son"} onClick={() => setMuted(!muted)}>{muted || vol === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}</Button>
              <input type="range" aria-label="Volume" min={0} max={1} step={0.05} value={vol} onChange={(e) => { setVol(Number(e.target.value)); setMuted(false); }} className="hidden w-20 accent-primary sm:block" />
              {kind === "video" && <Button size="icon" variant="ghost" aria-label="Plein écran" onClick={() => box.current?.requestFullscreen?.().catch(() => {})}><Maximize className="size-4" /></Button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
