import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearRwLexiconCache,
  lookupRwWord,
  rwLexiconShardKey,
  type RwLexiconShard,
} from "./rw-lexicon";

const loadShard = vi.fn(async (key: string): Promise<RwLexiconShard> => {
  try {
    return JSON.parse(readFileSync(`public/rw-lexicon/${key}.json`, "utf8")) as RwLexiconShard;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { v: 1, e: {}, a: {} };
    throw error;
  }
});

beforeEach(() => {
  clearRwLexiconCache();
  loadShard.mockClear();
});

describe("autonomous Reading Workshop lexicon", () => {
  it("resolves a conjugated verb without any AI or network request", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const gloss = await lookupRwWord("helps", "Education helps children.", loadShard);
    expect(gloss.base_form).toBe("help");
    expect(gloss.translation_fr).toContain("aider");
    expect(gloss.part_of_speech_fr).toBe("verbe");
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("filters a noisy long translation when concise alternatives exist", async () => {
    const gloss = await lookupRwWord("succeeds", "The company finally succeeds.", loadShard);
    expect(gloss.base_form).toBe("succeed");
    expect(gloss.translation_fr).toContain("réussir");
    expect(gloss.translation_fr).not.toContain("bifteck");
  });

  it("resolves an irregular plural through the local inflection index", async () => {
    const gloss = await lookupRwWord("children", "The children learn together.", loadShard);
    expect(gloss.base_form).toBe("child");
    expect(gloss.translation_fr).toContain("enfant");
  });

  it("recognizes a complete inflected phrasal verb", async () => {
    const gloss = await lookupRwWord("gave", "They gave up after two attempts.", loadShard);
    expect(gloss.lookup_text).toBe("gave up");
    expect(gloss.base_form).toBe("give up");
    expect(gloss.translation_fr).toMatch(/abandonner|renoncer/);
    expect(gloss.part_of_speech_fr).toBe("verbe à particule");
  });

  it("uses grammatical and lexical context for light", async () => {
    const gloss = await lookupRwWord("light", "Please light the candle.", loadShard);
    expect(gloss.translation_fr).toMatch(/allumer|enflammer/);
    expect(gloss.part_of_speech_fr).toBe("verbe");
  });

  it("shows several meanings when context cannot safely select one", async () => {
    const gloss = await lookupRwWord("bank", "It is a bank.", loadShard);
    expect(gloss.note_fr).toContain("Plusieurs traductions possibles");
    expect(gloss.translation_fr.length).toBeGreaterThan(0);
  });

  it("keeps a proper noun without inventing a translation", async () => {
    const gloss = await lookupRwWord("Armand", "Armand lives in Libreville.", loadShard);
    expect(gloss.part_of_speech_fr).toBe("nom propre");
    expect(gloss.translation_fr).toBe("Armand");
  });

  it("uses the in-memory cache for a repeated lookup", async () => {
    await lookupRwWord("helps", "Education helps children.", loadShard);
    const calls = loadShard.mock.calls.length;
    const again = await lookupRwWord("helps", "Education helps children.", loadShard);
    expect(again.translation_fr).toContain("aider");
    expect(loadShard.mock.calls.length).toBe(calls);
  });

  it("reports an unknown word without an AI fallback", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(lookupRwWord("zzzzunknown", "Zzzzunknown is not listed.", loadShard)).rejects.toThrow("Aucun appel IA");
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("keeps AI gateway code out of the clicked-word path", () => {
    const reader = readFileSync("src/components/reading-workshop/smart-reader.tsx", "utf8");
    const lexicon = readFileSync("src/lib/rw-lexicon.ts", "utf8");
    const functions = readFileSync("src/lib/rw-lessons.functions.ts", "utf8");
    expect(lexicon).not.toMatch(/ai\.gateway|LOVABLE_API_KEY|openai|gpt-/i);
    expect(reader).not.toContain("translateRwWord");
    expect(functions).not.toContain("glossRwWord");
  });

  it("uses compact two-letter shards", () => {
    expect(rwLexiconShardKey("education")).toBe("ed");
    expect(rwLexiconShardKey("give up")).toBe("gi");
  });
});
