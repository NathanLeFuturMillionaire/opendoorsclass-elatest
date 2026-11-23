import { describe, expect, it } from "vitest";
import {
  glossCacheKey,
  readPersistentGloss,
  writePersistentGloss,
  type GlossStorage,
  type RwGloss,
} from "./rw-gloss-cache";

function memoryStorage(): GlossStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

const gloss: RwGloss = {
  translation_fr: "aider",
  phonetic: "hɛlp",
  part_of_speech_fr: "verbe",
  note_fr: "",
  meaning_in_context_fr: "Dans cette phrase, le sens retenu est : aider.",
  other_meanings_fr: ["assistance"],
  base_form: "help",
  example_en: "They help us.",
  example_fr: "Dans cet exemple, help renvoie à : aider.",
  lookup_text: "help",
};

describe("persistent local gloss cache", () => {
  it("reads a previously consulted word without another request", () => {
    const storage = memoryStorage();
    const key = glossCacheKey("Help", "They help us.");
    writePersistentGloss(key, gloss, storage, 100);
    expect(readPersistentGloss(key, storage)).toEqual(gloss);
  });

  it("keeps only the sixty most recent entries", () => {
    const storage = memoryStorage();
    for (let index = 0; index < 65; index++) {
      writePersistentGloss(`word-${index}`, { ...gloss, lookup_text: `word-${index}` }, storage, index);
    }
    expect(readPersistentGloss("word-0", storage)).toBeNull();
    expect(readPersistentGloss("word-4", storage)).toBeNull();
    expect(readPersistentGloss("word-64", storage)?.lookup_text).toBe("word-64");
  });

  it("ignores corrupted cached data", () => {
    const storage = memoryStorage();
    storage.values.set("rw-local-gloss-v1", "not-json");
    expect(readPersistentGloss("help", storage)).toBeNull();
  });
});
