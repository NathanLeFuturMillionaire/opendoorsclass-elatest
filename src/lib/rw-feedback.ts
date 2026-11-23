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

let audioContext: AudioContext | null = null;

function contextForSound(): AudioContext | null {
  if (typeof window === "undefined" || !window.AudioContext) return null;
  audioContext ??= new AudioContext();
  return audioContext;
}

/** Call synchronously from the answer click so mobile browsers allow the later sound. */
export function primeRwFeedback(enabled: boolean) {
  if (!enabled) return;
  const context = contextForSound();
  if (context?.state === "suspended") void context.resume().catch(() => undefined);
}

function tone(
  context: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  volume: number,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.01);
}

/** Short, soft synthesized tones keep the feature light and work offline. */
export function playRwFeedback(sound: Exclude<RwAnswerSound, null>, enabled: boolean) {
  if (!enabled) return;
  const context = contextForSound();
  if (!context) return;
  if (context.state === "suspended") void context.resume().catch(() => undefined);
  const start = context.currentTime + 0.015;
  if (sound === "success") {
    tone(context, 523.25, start, 0.2, 0.045);
    tone(context, 659.25, start + 0.11, 0.25, 0.04);
  } else {
    tone(context, 392, start, 0.18, 0.035);
    tone(context, 329.63, start + 0.09, 0.22, 0.03);
  }
}
