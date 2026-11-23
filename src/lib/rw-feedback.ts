export const RW_SOUND_PREFERENCE_KEY = "rw-comprehension-sound-enabled";

export type RwAnswerSound = "success" | "error" | null;

export function rwSoundPreferenceEnabled(storedValue: string | null) {
  return storedValue !== "false";
}

/** Only an objectively graded answer produces a sound. Pending coach review stays silent. */
export function rwAnswerSound(
  status: "auto_graded" | "pending" | "graded",
  points: number | null,
): RwAnswerSound {
  if (status !== "auto_graded") return null;
  if (points === 2) return "success";
  if (points === 0) return "error";
  return null;
}

export type RwFeedbackTone = {
  frequency: number;
  start: number;
  duration: number;
  volume: number;
};

/**
 * Loud, clearly audible tones. Every level sits between 0.7 and 0.9 so the
 * sound carries on a phone speaker without saturating; the shared limiter
 * below keeps the short overlap of two notes free of clipping.
 */
export const RW_FEEDBACK_TONES: Record<"success" | "error", RwFeedbackTone[]> = {
  success: [
    { frequency: 523.25, start: 0, duration: 0.22, volume: 0.85 },
    { frequency: 659.25, start: 0.11, duration: 0.28, volume: 0.8 },
  ],
  error: [
    { frequency: 392, start: 0, duration: 0.2, volume: 0.82 },
    { frequency: 329.63, start: 0.09, duration: 0.26, volume: 0.75 },
  ],
};

/** Master level applied to every tone, kept below full scale on purpose. */
export const RW_FEEDBACK_MASTER_GAIN = 0.95;

let audioContext: AudioContext | null = null;
let outputBus: AudioNode | null = null;

function contextForSound(): AudioContext | null {
  if (typeof window === "undefined" || !window.AudioContext) return null;
  audioContext ??= new AudioContext();
  return audioContext;
}

/** Shared limiter so overlapping notes stay loud but never distort. */
function outputForContext(context: AudioContext): AudioNode {
  if (outputBus && outputBus.context === context) return outputBus;
  const master = context.createGain();
  master.gain.value = RW_FEEDBACK_MASTER_GAIN;
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.12;
  master.connect(limiter);
  limiter.connect(context.destination);
  outputBus = master;
  return master;
}

/** Call synchronously from the answer click so mobile browsers allow the later sound. */
export function primeRwFeedback(enabled: boolean) {
  if (!enabled) return;
  const context = contextForSound();
  if (context?.state === "suspended") void context.resume().catch(() => undefined);
}

function tone(
  context: AudioContext,
  bus: AudioNode,
  frequency: number,
  start: number,
  duration: number,
  volume: number,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.setValueAtTime(volume, start + duration * 0.55);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(bus);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.01);
}

/** Short synthesized tones keep the feature light and work offline. */
export function playRwFeedback(sound: Exclude<RwAnswerSound, null>, enabled: boolean) {
  if (!enabled) return;
  const context = contextForSound();
  if (!context) return;
  if (context.state === "suspended") void context.resume().catch(() => undefined);
  const bus = outputForContext(context);
  const start = context.currentTime + 0.015;
  for (const note of RW_FEEDBACK_TONES[sound]) {
    tone(context, bus, note.frequency, start + note.start, note.duration, note.volume);
  }
}
