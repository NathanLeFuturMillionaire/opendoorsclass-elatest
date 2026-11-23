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
