export type RwToken = { t: string; start: number; sentence: number };
export type RwSentence = { text: string; start: number; paragraph: number };
export type RwParagraph = { tokens: RwToken[]; first: number; last: number };

/** Splits a text into paragraphs, sentences and word tokens with absolute offsets. */
export function splitReaderText(body: string) {
  const sentences: RwSentence[] = [];
  const paragraphs: RwParagraph[] = [];
  const re = /\S[^]*?(?:[.!?]+["'’”)]*(?=\s|$)|$)/g;
  let offset = 0;
  body.split(/\n\s*\n/).forEach((p, pi) => {
    const first = sentences.length;
    const bounds: { start: number; end: number }[] = [];
    for (const m of p.matchAll(re)) {
      if (!m[0].trim()) continue;
      sentences.push({ text: m[0].trim(), start: offset + (m.index ?? 0), paragraph: pi });
      bounds.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
    }
    let local = 0;
    const tokens = p.split(/(\s+)/).filter((t) => t !== "").map((t) => {
      const at = local; local += t.length;
      let si = bounds.findIndex((b) => at >= b.start && at < b.end);
      if (si < 0) si = Math.max(0, bounds.length - 1);
      return { t, start: offset + at, sentence: first + si };
    });
    paragraphs.push({ tokens, first, last: sentences.length - 1 });
    offset += p.length + 2;
  });
  return { sentences, paragraphs };
}

/** Index of the last sentence to read for a mode, starting at `from`. */
export function playEnd(mode: "all" | "sentence" | "paragraph", from: number, sentences: RwSentence[]) {
  if (mode === "sentence") return from;
  if (mode === "paragraph") { let i = from; while (i + 1 < sentences.length && sentences[i + 1].paragraph === sentences[from].paragraph) i++; return i; }
  return sentences.length - 1;
}

/** Picks the first voice for an accent: British en-GB or American en-US. */
export function pickVoice<V extends { lang: string }>(voices: V[], accent: "GB" | "US"): V | undefined {
  const tag = accent === "GB" ? /en[-_]GB/i : /en[-_]US/i;
  return voices.find((v) => tag.test(v.lang));
}
