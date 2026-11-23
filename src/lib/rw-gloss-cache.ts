export type RwGloss = {
  translation_fr: string;
  phonetic?: string;
  part_of_speech_fr?: string;
  note_fr?: string;
  meaning_in_context_fr?: string;
  other_meanings_fr?: string[];
  base_form?: string;
  example_en?: string;
  example_fr?: string;
  lookup_text?: string;
  definition_en?: string;
};

export type GlossStorage = Pick<Storage, "getItem" | "setItem">;

const STORAGE_KEY = "rw-local-gloss-v1";
const MAX_ENTRIES = 60;

type CachedValue = { at: number; gloss: RwGloss };
type CachedPayload = { values: Record<string, CachedValue> };

function readPayload(storage: GlossStorage): CachedPayload {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null") as unknown;
    if (!parsed || typeof parsed !== "object" || !("values" in parsed)) return { values: {} };
    const values = (parsed as CachedPayload).values;
    if (!values || typeof values !== "object" || Array.isArray(values)) return { values: {} };
    return { values };
  } catch {
    return { values: {} };
  }
}

export function glossCacheKey(word: string, sentence: string) {
  return `${word.trim().toLowerCase().replace(/’/g, "'")}|${sentence.trim()}`;
}

export function readPersistentGloss(key: string, storage: GlossStorage): RwGloss | null {
  const value = readPayload(storage).values[key];
  if (!value || typeof value.at !== "number" || !value.gloss) return null;
  const gloss = value.gloss;
  if (!gloss.translation_fr?.trim() || !gloss.lookup_text?.trim()) return null;
  return gloss;
}

export function writePersistentGloss(
  key: string,
  gloss: RwGloss,
  storage: GlossStorage,
  now = Date.now(),
) {
  const payload = readPayload(storage);
  payload.values[key] = { at: now, gloss };
  const retained = Object.entries(payload.values)
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, MAX_ENTRIES);
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ values: Object.fromEntries(retained) }));
  } catch {
    // A full or disabled storage must never block the dictionary lookup.
  }
}
