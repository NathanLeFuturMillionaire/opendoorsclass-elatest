import { describe, expect, it } from "vitest";
import { encodeSpeakingWav, splitSpeakingWav, canReadSpeakingAudio, speakingPartHasSound } from "./speaking-audio";
import { readSpeakingTranscript } from "./speaking-transcript";

describe("complete speaking capture", () => {
  it("keeps a short answer including its first and last samples", async () => {
    const b = await encodeSpeakingWav([new Float32Array([0.5, 0, -0.5])], 16000).arrayBuffer();
    const v = new DataView(b);
    expect(v.getUint32(40, true)).toBe(6);
    expect(v.getInt16(44, true)).toBe(16383);
    expect(v.getInt16(48, true)).toBe(-16384);
  });
  it("retains a natural silence between phrases", async () => {
    const chunks = [new Float32Array(16000).fill(0.5), new Float32Array(80000), new Float32Array(16000).fill(-0.5)];
    const b = await encodeSpeakingWav(chunks, 16000).arrayBuffer();
    const v = new DataView(b);
    expect(v.getUint32(40, true)).toBe(224000);
    expect(v.getInt16(44 + 2 * 48000, true)).toBe(0);
    expect(v.getInt16(b.byteLength - 2, true)).toBe(-16384);
  });
  it("processes every segment and the tail of a long response", async () => {
    const b = await encodeSpeakingWav([new Float32Array(16000 * 271).fill(0.2)], 16000).arrayBuffer();
    const parts = splitSpeakingWav(b, 90);
    expect(parts).toHaveLength(4);
    expect(parts.reduce((n, p) => n + p.size - 44, 0)).toBe(b.byteLength - 44);
    expect(parts[3]?.size).toBe(32044);
  });
  it("processes speech after a five second pause without discarding original samples", async () => {
    const b = await encodeSpeakingWav([new Float32Array(16000).fill(0.5), new Float32Array(80000), new Float32Array(16000).fill(-0.5)], 16000).arrayBuffer();
    const parts = splitSpeakingWav(b);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.reduce((n, p) => n + p.size - 44, 0)).toBe(224000);
    const audible = [];
    for (const part of parts) if (await speakingPartHasSound(part)) audible.push(part);
    expect(audible).toHaveLength(2);
    const tail = new DataView(await audible[1].arrayBuffer());
    expect(tail.getInt16(tail.byteLength - 2, true)).toBe(-16384);
  });
});
describe("final recognition results", () => {
  const sse = (items: object[]) => new Response(items.map((item) => `data: ${JSON.stringify(item)}\n\n`).join(""), { headers: { "content-type": "text/event-stream" } });
  it("uses the final text including the last sentence, not temporary text", async () => {
    expect(await readSpeakingTranscript(sse([{ type: "transcript.text.delta", delta: "First" }, { type: "transcript.text.done", text: "First sentence. Last sentence." }]))).toBe("First sentence. Last sentence.");
  });
  it("does not validate an incomplete recognition stream", async () => {
    await expect(readSpeakingTranscript(sse([{ type: "transcript.text.delta", delta: "First sentence" }]))).rejects.toThrow("résultat final absent");
  });
  it("handles UTF8 and event frames split over arbitrary network chunks", async () => {
    const bytes = new TextEncoder().encode('data: {"type":"transcript.text.done","text":"I visited a café. This is the final sentence."}\n\n');
    const body = new ReadableStream({ start(controller) { for (const value of bytes) controller.enqueue(new Uint8Array([value])); controller.close(); } });
    expect(await readSpeakingTranscript(new Response(body, { headers: { "content-type": "text/event-stream" } }))).toBe("I visited a café. This is the final sentence.");
  });
  it("surfaces refusal without accepting partial words", async () => {
    await expect(readSpeakingTranscript(sse([{ type: "error", message: "Access denied" }]))).rejects.toThrow("Access denied");
  });
});
describe("original audio confidentiality", () => {
  it("allows the candidate to replay their own audio", () => { expect(canReadSpeakingAudio("candidate", "candidate", ["user"])).toBe(true); });
  it("allows an authorized coach with the existing moderator role", () => { expect(canReadSpeakingAudio("coach", "candidate", ["moderator"])).toBe(true); });
  it("denies another candidate", () => { expect(canReadSpeakingAudio("other", "candidate", ["user"])).toBe(false); });
});