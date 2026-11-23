import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookmarkPlus,
  Check,
  Loader2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getCachedRwGloss, lookupRwWord, type RwGloss } from "@/lib/rw-lexicon";
import { pickVoice, playEnd, splitReaderText, type RwToken } from "@/lib/rw-reader";
import { cn } from "@/lib/utils";

type Vocab = {
  word: string;
  translation_fr: string;
  definition?: string;
  part_of_speech?: string;
};
type Gloss = RwGloss;
type Picked = {
  word: string;
  sentence: string;
  sentenceIndex: number;
  tokenStart: number;
  gloss?: Gloss;
  err?: string;
  loading: boolean;
};

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function speak(text: string, voice: SpeechSynthesisVoice | null, rate: number) {
  const utterance = new SpeechSynthesisUtterance(text);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "en-GB";
  }
  utterance.rate = rate;
  return utterance;
}

const cleanWord = (raw: string) => raw.replace(/^[^A-Za-z'’]+|[^A-Za-z'’]+$/g, "");

export function SmartReader({
  body,
  vocabulary,
  lessonId,
}: {
  body: string;
  vocabulary: Vocab[];
  lessonId?: string;
}) {
  const qc = useQueryClient();
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [accent, setAccent] = useState<"GB" | "US">("GB");
  const [voiceUri, setVoiceUri] = useState("");
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [mode, setMode] = useState<"all" | "paragraph" | "sentence">("all");
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [cursor, setCursor] = useState(-1);
  const [current, setCurrent] = useState(0);
  const [picked, setPicked] = useState<Picked | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const runId = useRef(0);
  const pickId = useRef(0);
  const posKey = lessonId ? `rw-reader-pos-${lessonId}` : "";

  const displayWord = picked?.gloss?.lookup_text?.trim() || picked?.word || "";

  async function saveWord() {
    if (!picked?.gloss || saving || !displayWord) return;
    setSaving(true);
    const gloss = picked.gloss;
    const { error } = await supabase.from("rw_saved_words").upsert(
      {
        word: displayWord.toLowerCase().slice(0, 40),
        translation_fr: gloss.translation_fr.slice(0, 200),
        phonetic: gloss.phonetic?.slice(0, 80) ?? null,
        part_of_speech: gloss.part_of_speech_fr?.slice(0, 60) ?? null,
        sentence: picked.sentence.slice(0, 400),
        lesson_id: lessonId ?? null,
      },
      { onConflict: "user_id,word" },
    );
    setSaving(false);
    if (error) {
      toast.error("Mot non enregistré. Vérifiez votre connexion et réessayez.");
      return;
    }
    setSaved((currentSaved) => new Set(currentSaved).add(displayWord.toLowerCase()));
    qc.invalidateQueries({ queryKey: ["rw-saved-words"] });
    toast.success("Mot ajouté à votre dictionnaire.");
  }

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () =>
      setVoices(
        window.speechSynthesis
          .getVoices()
          .filter((voiceItem) => voiceItem.lang.toLowerCase().startsWith("en")),
      );
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      runId.current++;
      pickId.current++;
      window.speechSynthesis.cancel();
    };
  }, []);

  const accentVoices = voices.filter((voiceItem) =>
    (accent === "GB" ? /en[-_]GB/i : /en[-_]US/i).test(voiceItem.lang),
  );
  useEffect(() => {
    setVoiceUri((currentUri) =>
      accentVoices.some((voiceItem) => voiceItem.voiceURI === currentUri)
        ? currentUri
        : (pickVoice(voices, accent)?.voiceURI ?? ""),
    );
    // The selected voice is recalculated only when the installed voices or accent change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voices, accent]);
  const voice = voices.find((voiceItem) => voiceItem.voiceURI === voiceUri) ?? voices[0] ?? null;

  const { sentences, paragraphs } = useMemo(() => splitReaderText(body), [body]);
  const vocabMap = useMemo(
    () => new Map(vocabulary.map((item) => [item.word.toLowerCase(), item])),
    [vocabulary],
  );

  useEffect(() => {
    if (!posKey) return;
    const stored = Number(localStorage.getItem(posKey));
    if (Number.isInteger(stored) && stored > 0 && stored < sentences.length) setCurrent(stored);
  }, [posKey, sentences.length]);
  useEffect(() => {
    if (posKey) localStorage.setItem(posKey, String(current));
  }, [posKey, current]);

  function playFrom(from: number) {
    window.speechSynthesis.cancel();
    const id = ++runId.current;
    const last = playEnd(mode, from, sentences);
    setState("playing");
    const run = (index: number) => {
      if (id !== runId.current) return;
      if (index > last) {
        setState("idle");
        setCursor(-1);
        if (index >= sentences.length) setCurrent(0);
        return;
      }
      setCurrent(index);
      const sentence = sentences[index];
      if (!sentence) return;
      const utterance = speak(sentence.text, voice, rate);
      utterance.volume = volume;
      utterance.onboundary = (event) => {
        if (id === runId.current && (event.name === "word" || event.name === undefined)) {
          setCursor(sentence.start + event.charIndex);
        }
      };
      utterance.onend = () => run(index + 1);
      utterance.onerror = (event) => {
        if (
          id === runId.current &&
          event.error !== "interrupted" &&
          event.error !== "canceled"
        ) {
          setState("idle");
          setCursor(-1);
        }
      };
      window.speechSynthesis.speak(utterance);
    };
    run(from);
  }

  function stop() {
    runId.current++;
    window.speechSynthesis.cancel();
    setState("idle");
    setCursor(-1);
  }

  function toggle() {
    if (state === "idle") playFrom(current);
    else if (state === "playing") {
      window.speechSynthesis.pause();
      setState("paused");
    } else {
      window.speechSynthesis.resume();
      setState("playing");
    }
  }

  function step(direction: number) {
    const next = Math.min(Math.max(0, current + direction), sentences.length - 1);
    setCurrent(next);
    if (state !== "idle") playFrom(next);
  }

  useEffect(() => {
    if (state !== "idle") playFrom(current);
    // Restart with the newly selected reading settings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate, voiceUri, volume, mode]);

  async function pick(raw: string, sentence: string, sentenceIndex: number, tokenStart: number) {
    const word = cleanWord(raw);
    if (!word) return;
    if (supported) {
      runId.current++;
      window.speechSynthesis.cancel();
      setState("idle");
      setCursor(-1);
      window.speechSynthesis.speak(speak(word, voice, 0.85));
    }

    const requestId = ++pickId.current;
    const cached = getCachedRwGloss(word, sentence);
    const vocab = vocabMap.get(word.toLowerCase());
    const fallback: Gloss | undefined = vocab
      ? {
          translation_fr: vocab.translation_fr,
          note_fr: vocab.definition,
          part_of_speech_fr: vocab.part_of_speech,
        }
      : undefined;
    setPicked({
      word,
      sentence,
      sentenceIndex,
      tokenStart,
      gloss: cached ?? fallback,
      loading: !cached,
    });
    if (cached) return;

    try {
      const gloss = await lookupRwWord(word, sentence);
      setPicked((currentPicked) =>
        requestId === pickId.current && currentPicked?.tokenStart === tokenStart
          ? { ...currentPicked, gloss, loading: false }
          : currentPicked,
      );
    } catch (error) {
      setPicked((currentPicked) =>
        requestId === pickId.current && currentPicked?.tokenStart === tokenStart
          ? {
              ...currentPicked,
              loading: false,
              err:
                error instanceof Error
                  ? error.message
                  : "Aucune définition fiable n'est disponible pour ce mot.",
            }
          : currentPicked,
      );
    }
  }

  function isPickedToken(token: RwToken) {
    if (!picked || picked.sentenceIndex !== token.sentence) return false;
    const phrase = picked.gloss?.lookup_text?.trim() || picked.word;
    const sentence = sentences[token.sentence];
    if (!sentence) return picked.tokenStart === token.start;
    const phraseAt = sentence.text.toLowerCase().indexOf(phrase.toLowerCase());
    if (phraseAt < 0) return picked.tokenStart === token.start;
    const start = sentence.start + phraseAt;
    return token.start >= start && token.start < start + phrase.length;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--rw-shadow)]">
        {supported ? (
          <>
            <Button size="icon" variant="ghost" aria-label="Phrase précédente" onClick={() => step(-1)}>
              <SkipBack className="size-4" />
            </Button>
            <Button size="sm" onClick={toggle}>
              {state === "playing" ? <Pause className="mr-1.5 size-4" /> : <Play className="mr-1.5 size-4" />}
              {state === "playing"
                ? "Pause"
                : state === "paused"
                  ? "Reprendre"
                  : current > 0
                    ? "Reprendre la lecture"
                    : "Écouter le texte"}
            </Button>
            <Button size="icon" variant="ghost" aria-label="Phrase suivante" onClick={() => step(1)}>
              <SkipForward className="size-4" />
            </Button>
            {state !== "idle" && (
              <Button size="icon" variant="outline" aria-label="Arrêter" onClick={stop}>
                <Square className="size-4" />
              </Button>
            )}
            <span className="text-xs tabular-nums text-muted-foreground">
              Phrase {Math.min(current + 1, sentences.length)} / {sentences.length}
            </span>
            <div className="flex rounded-full border border-border p-0.5 text-xs">
              {SPEEDS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setRate(speed)}
                  className={cn(
                    "rounded-full px-2.5 py-1 font-semibold",
                    rate === speed
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {speed}x
                </button>
              ))}
            </div>
            <select
              aria-label="Lire"
              value={mode}
              onChange={(event) => setMode(event.target.value as typeof mode)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs"
            >
              <option value="all">Tout le texte</option>
              <option value="paragraph">Un paragraphe</option>
              <option value="sentence">Une phrase</option>
            </select>
            <div className="flex rounded-full border border-border p-0.5 text-xs">
              {([["GB", "Britannique"], ["US", "Américaine"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAccent(key)}
                  className={cn(
                    "rounded-full px-2.5 py-1 font-semibold",
                    accent === key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {accentVoices.length > 1 && (
              <select
                aria-label="Voix"
                value={voiceUri}
                onChange={(event) => setVoiceUri(event.target.value)}
                className="max-w-[200px] rounded-full border border-border bg-background px-3 py-1.5 text-xs"
              >
                {accentVoices.map((voiceItem) => (
                  <option key={voiceItem.voiceURI} value={voiceItem.voiceURI}>
                    {voiceItem.name}
                  </option>
                ))}
              </select>
            )}
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Volume2 className="size-4" />
              <input
                type="range"
                aria-label="Volume"
                min={0}
                max={1}
                step={0.1}
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="w-20 accent-primary"
              />
            </label>
            <p className="w-full text-xs text-muted-foreground">
              Voix synthétique de votre appareil
              {!accentVoices.length && voices.length
                ? ` : aucune voix ${accent === "GB" ? "britannique" : "américaine"} installée, une autre voix anglaise est utilisée`
                : ""}
              .
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            La lecture audio n'est pas disponible sur ce navigateur.
          </p>
        )}
        <p className="w-full text-xs text-muted-foreground">
          Astuce : touchez un mot pour l'entendre et voir sa traduction.
        </p>
      </div>

      <div className="space-y-4 rounded-3xl border border-border bg-card p-6 text-lg leading-relaxed shadow-[var(--rw-shadow)] sm:p-8">
        {paragraphs.map((paragraph, paragraphIndex) => (
          <p key={paragraphIndex}>
            {paragraph.tokens.map((token, tokenIndex) =>
              /^\s+$/.test(token.t) || !token.t ? (
                token.t
              ) : (
                <button
                  key={tokenIndex}
                  type="button"
                  aria-pressed={isPickedToken(token)}
                  onClick={() => {
                    if (state === "idle") setCurrent(token.sentence);
                    void pick(
                      token.t,
                      sentences[token.sentence]?.text ?? "",
                      token.sentence,
                      token.start,
                    );
                  }}
                  className={cn(
                    "rounded px-0.5 text-left transition hover:bg-[var(--rw-soft)]",
                    vocabMap.has(cleanWord(token.t).toLowerCase()) &&
                      "underline decoration-primary/50 decoration-dotted underline-offset-4",
                    state !== "idle" && token.sentence === current && "bg-[var(--rw-soft)]",
                    isPickedToken(token) && "bg-primary/15 ring-1 ring-primary/30",
                    cursor >= token.start &&
                      cursor < token.start + token.t.length &&
                      "bg-primary/20",
                  )}
                >
                  {token.t}
                </button>
              ),
            )}
          </p>
        ))}
      </div>

      {picked && (
        <section
          aria-label="Explication du mot"
          aria-live="polite"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto max-h-[74vh] max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Word</p>
              <p className="break-words text-xl font-bold text-primary">{displayWord}</p>
              {picked.gloss ? (
                <div className="mt-3 space-y-3 text-sm">
                  {picked.gloss.phonetic && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pronunciation</p>
                      <p className="mt-0.5 text-muted-foreground">
                        /{picked.gloss.phonetic.replace(/^\/|\/$/g, "")}/
                      </p>
                    </div>
                  )}
                  {picked.gloss.part_of_speech_fr && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Part of speech</p>
                      <p className="mt-0.5">{picked.gloss.part_of_speech_fr}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Translation</p>
                    <p className="mt-0.5 text-base font-semibold">{picked.gloss.translation_fr}</p>
                  </div>
                  {picked.gloss.base_form &&
                    picked.gloss.base_form.toLowerCase() !== displayWord.toLowerCase() && (
                      <p className="text-xs text-muted-foreground">
                        Forme de base : <span className="font-semibold text-foreground">{picked.gloss.base_form}</span>
                      </p>
                    )}
                  {picked.gloss.meaning_in_context_fr && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contextual meaning</p>
                      <p className="mt-0.5">{picked.gloss.meaning_in_context_fr}</p>
                    </div>
                  )}
                  {picked.gloss.note_fr && (
                    <p className="text-muted-foreground">{picked.gloss.note_fr}</p>
                  )}
                  {picked.gloss.definition_en && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Definition in English</p>
                      <p className="mt-0.5 text-muted-foreground">{picked.gloss.definition_en}</p>
                    </div>
                  )}
                  {!!picked.gloss.other_meanings_fr?.length && (
                    <p>
                      <span className="font-semibold">Autres sens : </span>
                      {picked.gloss.other_meanings_fr.join(", ")}
                    </p>
                  )}
                  {picked.gloss.example_en && (
                    <div className="rounded-xl bg-[var(--rw-soft)] p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Example</p>
                      <p className="mt-1 italic">{picked.gloss.example_en}</p>
                      {picked.gloss.example_fr && (
                        <p className="mt-1 text-muted-foreground">{picked.gloss.example_fr}</p>
                      )}
                    </div>
                  )}
                  {picked.loading && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" /> Précision du sens dans cette phrase…
                    </p>
                  )}
                  {picked.err && (
                    <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                      {picked.err} Les informations déjà disponibles restent affichées.
                    </p>
                  )}
                </div>
              ) : picked.loading ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Recherche du sens dans cette phrase…
                </p>
              ) : (
                <p className="mt-3 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                  {picked.err || "Aucune définition fiable n'est disponible pour ce mot. Essayez un autre mot."}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              {supported && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Prononcer"
                  onClick={() => {
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(speak(displayWord, voice, 0.85));
                  }}
                >
                  <Volume2 className="size-4" />
                </Button>
              )}
              {picked.gloss && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Ajouter au dictionnaire"
                  disabled={saving || saved.has(displayWord.toLowerCase())}
                  onClick={saveWord}
                >
                  {saved.has(displayWord.toLowerCase()) ? (
                    <Check className="size-4" />
                  ) : saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <BookmarkPlus className="size-4" />
                  )}
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                aria-label="Fermer"
                onClick={() => {
                  pickId.current++;
                  setPicked(null);
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            Base lexicale locale sans IA · <a href="/licenses/rw-lexicon.txt" target="_blank" rel="noreferrer" className="underline underline-offset-2">Sources et licences</a>
          </p>
        </section>
      )}
    </div>
  );
}
