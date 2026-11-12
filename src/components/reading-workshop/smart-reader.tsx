import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BookmarkPlus, Check, Loader2, Pause, Play, Square, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { translateRwWord } from "@/lib/rw-lessons.functions";
import { cn } from "@/lib/utils";

type Vocab = { word: string; translation_fr: string; definition?: string; part_of_speech?: string };
type Gloss = { translation_fr: string; phonetic?: string; note_fr?: string; part_of_speech_fr?: string };
const SPEEDS = [0.6, 0.8, 1, 1.2];
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
  const [voiceUri, setVoiceUri] = useState("");
  const [rate, setRate] = useState(1);
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [cursor, setCursor] = useState(-1);
  const [picked, setPicked] = useState<{ word: string; sentence: string; gloss?: Gloss; err?: string } | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const stopRef = useRef(false);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => {
      const en = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
      setVoices(en);
      setVoiceUri((cur) => cur || (en.find((v) => /en-GB/i.test(v.lang)) ?? en[0])?.voiceURI || "");
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => { window.speechSynthesis.removeEventListener("voiceschanged", load); window.speechSynthesis.cancel(); };
  }, []);
  const voice = voices.find((v) => v.voiceURI === voiceUri) ?? null;

  // Tokenize: paragraphs, then words with absolute char offsets.
  const paragraphs = useMemo(() => {
    let offset = 0;
    return body.split(/\n\s*\n/).map((p) => {
      const tokens = p.split(/(\s+)/).map((t) => { const start = offset; offset += t.length; return { t, start }; });
      offset += 2;
      return { text: p, tokens };
    });
  }, [body]);
  const vocabMap = useMemo(() => new Map(vocabulary.map((v) => [v.word.toLowerCase(), v])), [vocabulary]);

  function playFrom(pIndex: number) {
    window.speechSynthesis.cancel();
    stopRef.current = false;
    setState("playing");
    const run = (i: number) => {
      if (stopRef.current || i >= paragraphs.length) { setState("idle"); setCursor(-1); return; }
      const p = paragraphs[i];
      const base = p.tokens[0]?.start ?? 0;
      const u = speak(p.text, voice, rate);
      u.onboundary = (e) => { if (e.name === "word" || e.name === undefined) setCursor(base + e.charIndex); };
      u.onend = () => run(i + 1);
      u.onerror = () => { setState("idle"); setCursor(-1); };
      window.speechSynthesis.speak(u);
    };
    run(pIndex);
  }
  function stop() { stopRef.current = true; window.speechSynthesis.cancel(); setState("idle"); setCursor(-1); }
  function toggle() {
    if (state === "idle") playFrom(0);
    else if (state === "playing") { window.speechSynthesis.pause(); setState("paused"); }
    else { window.speechSynthesis.resume(); setState("playing"); }
  }
  useEffect(() => { if (state !== "idle") playFrom(0); /* restart with new settings */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate, voiceUri]);

  async function pick(raw: string, paragraph: string) {
    const word = raw.replace(/^[^A-Za-z'’]+|[^A-Za-z'’]+$/g, "");
    if (!word) return;
    const sentence = paragraph.split(/(?<=[.!?])\s+/).find((s) => s.includes(word)) ?? paragraph;
    if (supported) { window.speechSynthesis.cancel(); setState("idle"); window.speechSynthesis.speak(speak(word, voice, 0.85)); }
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
            <Button size="sm" onClick={toggle}>{state === "playing" ? <Pause className="mr-1.5 size-4" /> : <Play className="mr-1.5 size-4" />}{state === "playing" ? "Pause" : state === "paused" ? "Reprendre" : "Écouter le texte"}</Button>
            {state !== "idle" && <Button size="sm" variant="outline" onClick={stop}><Square className="size-4" /></Button>}
            <div className="flex rounded-full border border-border p-0.5 text-xs">
              {SPEEDS.map((s) => (
                <button key={s} type="button" onClick={() => setRate(s)} className={cn("rounded-full px-2.5 py-1 font-semibold", rate === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{s}x</button>
              ))}
            </div>
            {voices.length > 0 && (
              <select aria-label="Voix" value={voiceUri} onChange={(e) => setVoiceUri(e.target.value)} className="max-w-[220px] rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
              </select>
            )}
          </>
        ) : <p className="text-sm text-muted-foreground">La lecture audio n'est pas disponible sur ce navigateur.</p>}
        <p className="w-full text-xs text-muted-foreground">Astuce : touchez un mot pour l'entendre et voir sa traduction.</p>
      </div>

      <div className="space-y-4 rounded-3xl border border-border bg-card p-6 text-lg leading-relaxed shadow-[var(--rw-shadow)] sm:p-8">
        {paragraphs.map((p, i) => (
          <p key={i}>
            {p.tokens.map((tk, j) => /^\s+$/.test(tk.t) || !tk.t ? tk.t : (
              <button key={j} type="button" onClick={() => pick(tk.t, p.text)}
                className={cn("rounded px-0.5 text-left transition hover:bg-[var(--rw-soft)]",
                  vocabMap.has(tk.t.replace(/[^A-Za-z'’]/g, "").toLowerCase()) && "underline decoration-primary/50 decoration-dotted underline-offset-4",
                  cursor >= tk.start && cursor < tk.start + tk.t.length && "bg-primary/20")}>{tk.t}</button>
            ))}
          </p>
        ))}
      </div>

      {picked && (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xl font-bold text-primary">{picked.word} {picked.gloss?.phonetic && <span className="text-sm font-normal text-muted-foreground">/{picked.gloss.phonetic.replace(/^\/|\/$/g, "")}/</span>}</p>
              {picked.gloss ? <>
                {picked.gloss.part_of_speech_fr && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{picked.gloss.part_of_speech_fr}</p>}
                <p className="font-semibold">{picked.gloss.translation_fr}</p>
                {picked.gloss.note_fr && <p className="mt-1 text-sm text-muted-foreground">{picked.gloss.note_fr}</p>}
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
