import { describe, expect, it } from "vitest";
import { pickVoice, playEnd, splitReaderText } from "./rw-reader";

describe("reader text", () => {
  const body = "Hello there. How are you?\n\nI am fine! Thanks.";
  const { sentences, paragraphs } = splitReaderText(body);
  it("splits sentences across paragraphs", () => {
    expect(sentences.map((s) => s.text)).toEqual(["Hello there.", "How are you?", "I am fine!", "Thanks."]);
    expect(sentences.map((s) => s.paragraph)).toEqual([0, 0, 1, 1]);
  });
  it("maps words to their sentence with absolute offsets", () => {
    const how = paragraphs[0].tokens.find((t) => t.t === "How")!;
    expect(how.sentence).toBe(1);
    expect(body.slice(how.start, how.start + 3)).toBe("How");
    const thanks = paragraphs[1].tokens.find((t) => t.t === "Thanks.")!;
    expect(thanks.sentence).toBe(3);
    expect(body.slice(thanks.start, thanks.start + 7)).toBe("Thanks.");
  });
  it("stops at the right sentence for each mode", () => {
    expect(playEnd("sentence", 2, sentences)).toBe(2);
    expect(playEnd("paragraph", 0, sentences)).toBe(1);
    expect(playEnd("all", 0, sentences)).toBe(3);
  });
  it("picks British or American voices", () => {
    const v = [{ lang: "en-US", n: 1 }, { lang: "en-GB", n: 2 }];
    expect(pickVoice(v, "GB")?.n).toBe(2);
    expect(pickVoice(v, "US")?.n).toBe(1);
  });
});
