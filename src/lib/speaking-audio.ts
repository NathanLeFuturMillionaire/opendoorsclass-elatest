export const SPEAKING_SAMPLE_RATE = 16000;

/** A complete mono PCM WAV, including silence and the final samples. */
export function encodeSpeakingWav(chunks: readonly Float32Array[], sampleRate: number): Blob {
  const length = chunks.reduce((n, c) => n + c.length, 0);
  const samples = new Float32Array(length);
  let cursor = 0;
  for (const c of chunks) { samples.set(c, cursor); cursor += c.length; }
  const count = Math.floor(length * SPEAKING_SAMPLE_RATE / sampleRate);
  const bytes = new ArrayBuffer(44 + count * 2);
  const v = new DataView(bytes);
  const tag = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) v.setUint8(offset + i, text.charCodeAt(i));
  };
  tag(0, "RIFF"); v.setUint32(4, 36 + count * 2, true); tag(8, "WAVE");
  tag(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, SPEAKING_SAMPLE_RATE, true);
  v.setUint32(28, SPEAKING_SAMPLE_RATE * 2, true); v.setUint16(32, 2, true);
  v.setUint16(34, 16, true); tag(36, "data"); v.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) {
    const position = i * sampleRate / SPEAKING_SAMPLE_RATE;
    const left = Math.floor(position);
    const sample = Math.max(-1, Math.min(1, (samples[left] ?? 0) * (1 - (position - left)) + (samples[Math.min(left + 1, length - 1)] ?? 0) * (position - left)));
    v.setInt16(44 + i * 2, sample * (sample < 0 ? 32768 : 32767), true);
  }
  return new Blob([bytes], { type: "audio/wav" });
}

/** Split into standalone WAV files; never upload headerless fragments. */
export function splitSpeakingWav(buffer: ArrayBuffer, seconds = 20): Blob[] {
  const v = new DataView(buffer);
  if (buffer.byteLength < 46 || v.getUint32(0) !== 0x52494646 || v.getUint32(8) !== 0x57415645 || v.getUint32(36) !== 0x64617461 || v.getUint16(20, true) !== 1 || v.getUint16(22, true) !== 1 || v.getUint16(34, true) !== 16) {
    throw new Error("Fichier audio WAV invalide.");
  }
  const rate = v.getUint32(24, true);
  const size = v.getUint32(40, true);
  if (rate !== SPEAKING_SAMPLE_RATE || size !== buffer.byteLength - 44 || size % 2 || seconds <= 0) throw new Error("Fichier audio incomplet.");
  const stride = Math.floor(seconds * rate) * 2;
  const result: Blob[] = [];
  for (let offset = 0; offset < size;) {
    let end = Math.min(size, offset + stride);
    // Long natural pauses get independent recognition contexts, not an early end of speech.
    let silence = 0;
    for (let i = offset; i < end; i += 2) {
      silence = Math.abs(v.getInt16(44 + i, true)) < 150 ? silence + 1 : 0;
      if (silence >= rate * 0.8 && i - offset > rate * 2) { end = i + 2; break; }
    }
    // Prefer a natural pause near a segment boundary without removing any samples.
    if (end < size) {
      let bestEnergy = Infinity;
      const boundary = end;
      const windowBytes = rate / 10 * 2;
      for (let candidate = Math.max(offset + windowBytes, boundary - rate * 4); candidate <= boundary; candidate += windowBytes) {
        let energy = 0;
        for (let i = candidate - windowBytes; i < candidate; i += 2) energy += Math.abs(v.getInt16(44 + i, true));
        if (energy < bestEnergy && energy / (windowBytes / 2) < 200) { bestEnergy = energy; end = candidate; }
      }
    }
    const header = buffer.slice(0, 44);
    const h = new DataView(header);
    h.setUint32(4, 36 + end - offset, true); h.setUint32(40, end - offset, true);
    result.push(new Blob([header, buffer.slice(44 + offset, 44 + end)], { type: "audio/wav" }));
    offset = end;
  }
  return result;
}

export async function speakingPartHasSound(part: Blob): Promise<boolean> {
  const data = new DataView(await part.arrayBuffer());
  for (let i = 44; i < data.byteLength; i += 2) if (Math.abs(data.getInt16(i, true)) > 150) return true;
  return false;
}

export function canReadSpeakingAudio(userId: string, ownerId: string, roles: readonly string[]): boolean {
  return userId === ownerId || roles.some((r) => ["owner", "admin", "moderator"].includes(r));
}