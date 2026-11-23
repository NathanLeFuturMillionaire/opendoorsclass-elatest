// Server-only: AI drafting of Reading Workshop lessons. Drafts always need admin validation.
const LENGTH: Record<string, string> = { A1: "100 to 150", A2: "130 to 180", B1: "160 to 220", B2: "200 to 280", C1: "250 to 350" };
const DASHES = /[\u2012\u2013\u2014\u2015\u2011]/g;

function noDash<T>(v: T): T {
  if (typeof v === "string") return v.replace(DASHES, ", ").replace(/ ,/g, ",") as T;
  if (Array.isArray(v)) return v.map(noDash) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, noDash(x)])) as T;
  return v;
}

export type RwDraft = {
  title: string; body: string; summary_fr: string; translation_fr: string; knowledge_point: string;
  vocabulary: { word: string; part_of_speech: string; translation_fr: string; definition: string; example: string }[];
  questions: { type?: string; question: string; options: string[]; answer: string; explanation_fr: string }[];
  grammar: { point: string; explanation_fr: string; example: string }[];
  discussion: string[];
  mention: "original" | "adapted"; source_author: string | null; source_title: string | null; source_date: string | null; content_type: string;
};

export async function draftRwLesson(input: { week: number; weekTitle: string; title: string; level: string }): Promise<RwDraft> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Service IA indisponible.");
  const system = `You write English reading lessons for the OpenDoorsClass Reading Workshop (French speaking learners in Gabon and Africa).
Rules:
- Write a genuinely re-written text for CEFR ${input.level}: vocabulary, grammar, sentence length and abstraction must match ${input.level}. Length ${LENGTH[input.level]} words.
- Every text must teach a real piece of knowledge (fact, idea, historical event, practical skill).
- Never use em dashes, en dashes or hyphen dashes as punctuation. Use commas, colons, parentheses and periods.
- Never invent quotations, dates, sources or URLs. Do not present invented sentences as real quotes.
- If the text is inspired by a real, well known person or speech, set mention "adapted" and give author, original title and date ONLY if you are certain; otherwise null. Otherwise mention "original" with null sources.
Return strict JSON with keys: title, body (paragraphs separated by blank lines), summary_fr, translation_fr (full French translation), knowledge_point (one sentence in French: what the learner learns), vocabulary (8 to 12 items: word, part_of_speech, translation_fr, definition in simple English, example), questions (exactly 10, each worth 2 points: mostly type "mcq" with options array of 4 and answer exactly equal to one option, plus 2 of type "true_false" with answer "True" or "False", and 1 of type "open" with a model answer; every item has type, question, options (empty for open), answer, explanation_fr), grammar (2 items: point, explanation_fr, example from the text), discussion (3 open questions in English), mention, source_author, source_title, source_date, content_type (one of: original text, biography, historical speech adaptation, article, story).`;
  const str = { type: "string" };
  const nstr = { type: ["string", "null"] };
  const obj = (props: Record<string, unknown>) => ({ type: "object", additionalProperties: false, required: Object.keys(props), properties: props });
  const schema = obj({
    title: str, body: str, summary_fr: str, translation_fr: str, knowledge_point: str,
    vocabulary: { type: "array", items: obj({ word: str, part_of_speech: str, translation_fr: str, definition: str, example: str }) },
    questions: { type: "array", items: obj({ type: str, question: str, options: { type: "array", items: str }, answer: str, explanation_fr: str }) },
    grammar: { type: "array", items: obj({ point: str, explanation_fr: str, example: str }) },
    discussion: { type: "array", items: str },
    mention: { type: "string", enum: ["original", "adapted"] },
    source_author: nstr, source_title: nstr, source_date: nstr, content_type: str,
  });
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions: system,
      input: `Week ${input.week}: ${input.weekTitle}. Session title: ${input.title}. Level: ${input.level}.`,
      text: { format: { type: "json_schema", name: "rw_lesson", strict: true, schema } },
    }),
  });
  if (res.status === 429) throw new Error("Trop de demandes à l'IA. Réessayez dans une minute.");
  if (res.status === 402) throw new Error("Crédits IA épuisés. Rechargez l'espace de travail pour continuer.");
  if (!res.ok || !res.body) throw new Error("L'IA n'a pas pu rédiger ce texte.");
  let out = "";
  let buf = "";
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const ev = JSON.parse(payload);
        if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") out += ev.delta;
        if (ev.type === "response.failed" || ev.type === "error") throw new Error("L'IA n'a pas pu rédiger ce texte.");
      } catch (e) { if (e instanceof Error && e.message.startsWith("L'IA")) throw e; }
    }
  }
  let parsed: any;
  try { parsed = JSON.parse(out); } catch { throw new Error("Réponse IA illisible, réessayez."); }
  const d = noDash(parsed) as RwDraft;
  if (!d.title || !d.body) throw new Error("Texte incomplet, réessayez.");
  return {
    ...d,
    mention: d.mention === "adapted" ? "adapted" : "original",
    vocabulary: Array.isArray(d.vocabulary) ? d.vocabulary : [],
    questions: (Array.isArray(d.questions) ? d.questions : []).filter((q: any) => q.type === "open" || q.type === "short" || (q.type === "true_false" && /^(True|False)$/.test(q.answer)) || (Array.isArray(q.options) && q.options.includes(q.answer))).slice(0, 10),
    grammar: Array.isArray(d.grammar) ? d.grammar : [],
    discussion: Array.isArray(d.discussion) ? d.discussion : [],
  };
}

export const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export type RwGloss = {
  translation_fr: string;
  phonetic: string;
  part_of_speech_fr: string;
  note_fr: string;
  meaning_in_context_fr: string;
  other_meanings_fr: string[];
  base_form: string;
  example_en: string;
  example_fr: string;
  lookup_text: string;
};

async function readGlossStream(res: Response) {
  if (!res.body) throw new Error("Traduction indisponible.");
  let output = "";
  let buffer = "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let event: any;
      try { event = JSON.parse(payload); } catch { continue; }
      if (event.type === "response.output_text.delta" && typeof event.delta === "string") output += event.delta;
      if (event.type === "response.failed" || event.type === "error") {
        throw new Error(event.error?.message || "Aucune définition fiable n'est disponible pour ce mot.");
      }
    }
  }
  if (!output.trim()) throw new Error("Aucune définition fiable n'est disponible pour ce mot.");
  return output;
}

/** Context aware French gloss, including idioms and phrasal verbs containing the clicked word. */
export async function glossRwWord(word: string, sentence: string): Promise<RwGloss> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Service IA indisponible.");
  const s = { type: "string" };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      instructions: "Explain one clicked English word in French using its exact sentence. If it belongs to a phrasal verb or idiom whose meaning needs several words, explain the complete expression instead of the isolated word. Set lookup_text to the shortest complete expression copied exactly from the sentence, or to the clicked word if no expression applies. Give translation_fr adapted to the context, phonetic (British IPA), part_of_speech_fr (nom, verbe, adjectif, adverbe, expression, verbe à particule, etc.), note_fr (one short French usage note), meaning_in_context_fr (the precise meaning in this sentence, in French), other_meanings_fr (up to 3 other common French senses, empty array if none), base_form (infinitive, singular or base expression), example_en (a new simple English example using lookup_text), and example_fr (its French translation). Never use em dashes, en dashes or non-breaking hyphens.",
      input: `Clicked word: ${word}\nSentence: ${sentence}`,
      text: { format: { type: "json_schema", name: "gloss", strict: true, schema: { type: "object", additionalProperties: false, required: ["translation_fr", "phonetic", "part_of_speech_fr", "note_fr", "meaning_in_context_fr", "other_meanings_fr", "base_form", "example_en", "example_fr", "lookup_text"], properties: { translation_fr: s, phonetic: s, part_of_speech_fr: s, note_fr: s, meaning_in_context_fr: s, other_meanings_fr: { type: "array", items: s }, base_form: s, example_en: s, example_fr: s, lookup_text: s } } } },
    }),
  });
  if (res.status === 429) throw new Error("Trop de demandes. Réessayez dans un instant.");
  if (res.status === 402) throw new Error("Crédits IA épuisés.");
  if (!res.ok) {
    let message = "Traduction indisponible.";
    try {
      const payload: any = await res.json();
      if (typeof payload.message === "string" && payload.message.trim()) message = payload.message;
    } catch { /* Keep the safe fallback message. */ }
    throw new Error(noDash(message).slice(0, 240));
  }
  const text = await readGlossStream(res);
  let parsed: any;
  try { parsed = JSON.parse(text); } catch { throw new Error("La définition reçue est illisible. Réessayez."); }
  const gloss = noDash(parsed) as RwGloss;
  if (!gloss.translation_fr?.trim() || !gloss.meaning_in_context_fr?.trim() || !gloss.lookup_text?.trim()) {
    throw new Error("Aucune définition fiable n'est disponible pour ce mot.");
  }
  return { ...gloss, lookup_text: gloss.lookup_text.trim().slice(0, 80) };
}
