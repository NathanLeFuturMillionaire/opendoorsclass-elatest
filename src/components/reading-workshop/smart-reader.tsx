import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BookmarkPlus, Check, Loader2, Pause, Play, SkipBack, SkipForward, Square, Volume2, X } from "lucide-react";
import { pickVoice, playEnd, splitReaderText } from "@/lib/rw-reader";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { translateRwWord } from "@/lib/rw-lessons.functions";
import { cn } from "@/lib/utils";

type Vocab = { word: string; translation_fr: string; definition?: string; part_of_speech?: string };
type Gloss = { translation_fr: string; phonetic?: string; note_fr?: string; part_of_speech_fr?: string; meaning_in_context_fr?: string; other_meanings_fr?: string[]; base_form?: string; example_en?: string; example_fr?: string };
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const cache = new Map<string, Gloss>();

function speak(text: string, voice: SpeechSynthesisVoice | null, rate: number) {
  const u = new SpeechSynthesisUtterance(text);
  if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = "en-GB";
  u.rate = rate;
  return u;
}

export function SmartReader({ body, vocabulary, lessonId }: { body: string; vocabulary: Vocab[]; lessonId?: string }) {
  const translate = useServerFn(translateRwWord);
  const qc = useQueryClient();
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  async function saveWord() {
    if (!picked?.gloss || saving) return;
    setSaving(true);
    const g = picked.gloss;
    const { error } = await supabase.from("rw_saved_words").upsert({
      word: picked.word.toLowerCase().slice(0, 40), translation_fr: g.translation_fr.slice(0, 200),
      phonetic: g.phonetic?.slice(0, 80) ?? null, part_of_speech: g.part_of_speech_fr?.slice(0, 60) ?? null,
      sentence: picked.sentence.slice(0, 400), lesson_id: lessonId ?? null,
    }, { onConflict: "user_id,word" });
    setSaving(false);
    if (error) return toast.error("Mot non enregistré. Vérifiez votre connexion et réessayez.");
    setSaved((s) => new Set(s).add(picked.word.toLowerCase()));
    qc.invalidateQueries({ queryKey: ["rw-saved-words"] });
    toast.success("Mot ajouté à votre dictionnaire.");
  }
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [accent, setAccent] = useState<"GB" | "US">("GB");
  const [voiceUri, setVoiceUri] = useState("");
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [mode, setMode] = useState<"all" | "paragraph" | "sentence">("all");
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [cursor, setCursor] = useState(-1);
  const [current, setCurrent] = useState(0);
  const [picked, setPicked] = useState<{ word: string; sentence: string; gloss?: Gloss; err?: string } | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const runId = useRef(0);
  const posKey = lessonId ? `rw-reader-pos-${lessonId}` : "";

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en")));
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => { window.speechSynthesis.removeEventListener("voiceschanged", load); runId.current++; window.speechSynthesis.cancel(); };
  }, []);
  const accentVoices = voices.filter((v) => (accent === "GB" ? /en[-_]GB/i : /en[-_]US/i).test(v.lang));
  useEffect(() => { setVoiceUri((cur) => (accentVoices.some((v) => v.voiceURI === cur) ? cur : pickVoice(voices, accent)?.voiceURI ?? "")); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voices, accent]);
  const voice = voices.find((v) => v.voiceURI === voiceUri) ?? voices[0] ?? null;

  const { sentences, paragraphs } = useMemo(() => splitReaderText(body), [body]);
  const vocabMap = useMemo(() => new Map(vocabulary.map((v) => [v.word.toLowerCase(), v])), [vocabulary]);

  // Resume where the learner stopped last time on this text.
  useEffect(() => {
    if (!posKey) return;
    const n = Number(localStorage.getItem(posKey));
    if (Number.isInteger(n) && n > 0 && n < sentences.length) setCurrent(n);
  }, [posKey, sentences.length]);
  useEffect(() => { if (posKey) localStorage.setItem(posKey, String(current)); }, [posKey, current]);

  function playFrom(from: number) {
    window.speechSynthesis.cancel();
    const id = ++runId.current;
    const last = playEnd(mode, from, sentences);
    setState("playing");
    const run = (i: number) => {
      if (id !== runId.current) return;
      if (i > last) { setState("idle"); setCursor(-1); if (i >= sentences.length) setCurrent(0); return; }
      setCurrent(i);
      const sn = sentences[i];
      const u = speak(sn.text, voice, rate);
      u.volume = volume;
      u.onboundary = (e) => { if (id === runId.current && (e.name === "word" || e.name === undefined)) setCursor(sn.start + e.charIndex); };
      u.onend = () => run(i + 1);
      u.onerror = (e) => { if (id === runId.current && e.error !== "interrupted" && e.error !== "canceled") { setState("idle"); setCursor(-1); } };
      window.speechSynthesis.speak(u);
    };
    run(from);
  }
  function stop() { runId.current++; window.speechSynthesis.cancel(); setState("idle"); setCursor(-1); }
  function toggle() {
    if (state === "idle") playFrom(current);
    else if (state === "playing") { window.speechSynthesis.pause(); setState("paused"); }
    else { window.speechSynthesis.resume(); setState("playing"); }
  }
  function step(d: number) {
    const n = Math.min(Math.max(0, current + d), sentences.length - 1);
    setCurrent(n);
    if (state !== "idle") playFrom(n);
  }
  useEffect(() => { if (state !== "idle") playFrom(current); /* restart with new settings */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate, voiceUri, volume, mode]);

  async function pick(raw: string, sentence: string) {
    const word = raw.replace(/^[^A-Za-z'’]+|[^A-Za-z'’]+$/g, "");
    if (!word) return;
    if (supported) { runId.current++; window.speechSynthesis.cancel(); setState("idle"); setCursor(-1); window.speechSynthesis.speak(speak(word, voice, 0.85)); }
    const key = word.toLowerCase();
    const v = vocabMap.get(key);
    if (v) return setPicked({ word, sentence, gloss: { translation_fr: v.translation_fr, note_fr: v.definition, part_of_speech_fr: v.part_of_speech } });
    if (cache.has(key + sentence)) return setPicked({ word, sentence, gloss: cache.get(key + sentence) });
    setPicked({ word, sentence });
    try {
      const g = await translate({ data: { word, sentence } });
      cache.set(key + sentence, g);
      setPicked((cur) => (cur?.word === word ? { ...cur, gloss: g } : cur));
    } catch (e) {
      setPicked((cur) => (cur?.word === word ? { ...cur, err: e instanceof Error ? e.message : "Traduction indisponible." } : cur));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--rw-shadow)]">
        {supported ? (
          <>
            <Button size="icon" variant="ghost" aria-label="Phrase précédente" onClick={() => step(-1)}><SkipBack className="size-4" /></Button>
            <Button size="sm" onClick={toggle}>{state === "playing" ? <Pause className="mr-1.5 size-4" /> : <Play className="mr-1.5 size-4" />}{state === "playing" ? "Pause" : state === "paused" ? "Reprendre" : current > 0 ? "Reprendre la lecture" : "Écouter le texte"}</Button>
            <Button size="icon" variant="ghost" aria-label="Phrase suivante" onClick={() => step(1)}><SkipForward className="size-4" /></Button>
            {state !== "idle" && <Button size="icon" variant="outline" aria-label="Arrêter" onClick={stop}><Square className="size-4" /></Button>}
            <span className="text-xs tabular-nums text-muted-foreground">Phrase {Math.min(current + 1, sentences.length)} / {sentences.length}</span>
            <div className="flex rounded-full border border-border p-0.5 text-xs">
              {SPEEDS.map((sp) => (
                <button key={sp} type="button" onClick={() => setRate(sp)} className={cn("rounded-full px-2.5 py-1 font-semibold", rate === sp ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{sp}x</button>
              ))}
            </div>
            <select aria-label="Lire" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs">
              <option value="all">Tout le texte</option>
              <option value="paragraph">Un paragraphe</option>
              <option value="sentence">Une phrase</option>
            </select>
            <div className="flex rounded-full border border-border p-0.5 text-xs">
              {([["GB", "Britannique"], ["US", "Américaine"]] as const).map(([k, label]) => (
                <button key={k} type="button" onClick={() => setAccent(k)} className={cn("rounded-full px-2.5 py-1 font-semibold", accent === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{label}</button>
              ))}
            </div>
            {accentVoices.length > 1 && (
              <select aria-label="Voix" value={voiceUri} onChange={(e) => setVoiceUri(e.target.value)} className="max-w-[200px] rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                {accentVoices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
              </select>
            )}
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground"><Volume2 className="size-4" />
              <input type="range" aria-label="Volume" min={0} max={1} step={0.1} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-20 accent-primary" />
            </label>
            <p className="w-full text-xs text-muted-foreground">Voix synthétique de votre appareil{!accentVoices.length && voices.length ? " : aucune voix " + (accent === "GB" ? "britannique" : "américaine") + " installée, une autre voix anglaise est utilisée" : ""}.</p>
          </>
        ) : <p className="text-sm text-muted-foreground">La lecture audio n'est pas disponible sur ce navigateur.</p>}
        <p className="w-full text-xs text-muted-foreground">Astuce : touchez un mot pour l'entendre et voir sa traduction.</p>
      </div>

      <div className="space-y-4 rounded-3xl border border-border bg-card p-6 text-lg leading-relaxed shadow-[var(--rw-shadow)] sm:p-8">
        {paragraphs.map((p, i) => (
          <p key={i}>
            {p.tokens.map((tk, j) => /^\s+$/.test(tk.t) || !tk.t ? tk.t : (
              <button key={j} type="button" onClick={() => { if (state === "idle") setCurrent(tk.sentence); pick(tk.t, sentences[tk.sentence]?.text ?? ""); }}
                className={cn("rounded px-0.5 text-left transition hover:bg-[var(--rw-soft)]",
                  vocabMap.has(tk.t.replace(/[^A-Za-z'’]/g, "").toLowerCase()) && "underline decoration-primary/50 decoration-dotted underline-offset-4",
                  state !== "idle" && tk.sentence === current && "bg-[var(--rw-soft)]",
                  cursor >= tk.start && cursor < tk.start + tk.t.length && "bg-primary/20")}>{tk.t}</button>
            ))}
          </p>
        ))}
      </div>

      {picked && (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-h-[70vh] max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xl font-bold text-primary">{picked.word} {picked.gloss?.phonetic && <span className="text-sm font-normal text-muted-foreground">/{picked.gloss.phonetic.replace(/^\/|\/$/g, "")}/</span>}</p>
              {picked.gloss ? <>
                {picked.gloss.part_of_speech_fr && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{picked.gloss.part_of_speech_fr}</p>}
                <p className="font-semibold">{picked.gloss.translation_fr}</p>
                {picked.gloss.base_form && picked.gloss.base_form.toLowerCase() !== picked.word.toLowerCase() && <p className="text-xs text-muted-foreground">Forme de base : <span className="font-semibold text-foreground">{picked.gloss.base_form}</span></p>}
                {picked.gloss.meaning_in_context_fr && <p className="mt-1 text-sm"><span className="font-semibold">Dans cette phrase : </span>{picked.gloss.meaning_in_context_fr}</p>}
                {picked.gloss.note_fr && <p className="mt-1 text-sm text-muted-foreground">{picked.gloss.note_fr}</p>}
                {!!picked.gloss.other_meanings_fr?.length && <p className="mt-1 text-sm"><span className="font-semibold">Autres sens : </span>{picked.gloss.other_meanings_fr.join(", ")}</p>}
                {picked.gloss.example_en && <div className="mt-2 rounded-xl bg-[var(--rw-soft)] p-2 text-sm"><p className="italic">{picked.gloss.example_en}</p>{picked.gloss.example_fr && <p className="text-muted-foreground">{picked.gloss.example_fr}</p>}</div>}
              </> : picked.err ? <p className="text-sm text-destructive">{picked.err}</p>
                : <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Traduction…</p>}
            </div>
            <div className="flex gap-1">
              {supported && <Button size="icon" variant="ghost" aria-label="Prononcer" onClick={() => { window.speechSynthesis.cancel(); window.speechSynthesis.speak(speak(picked.word, voice, 0.85)); }}><Volume2 className="size-4" /></Button>}
              {picked.gloss && <Button size="icon" variant="ghost" aria-label="Ajouter au dictionnaire" disabled={saving || saved.has(picked.word.toLowerCase())} onClick={saveWord}>{saved.has(picked.word.toLowerCase()) ? <Check className="size-4" /> : saving ? <Loader2 className="size-4 animate-spin" /> : <BookmarkPlus className="size-4" />}</Button>}
              <Button size="icon" variant="ghost" aria-label="Fermer" onClick={() => setPicked(null)}><X className="size-4" /></Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
