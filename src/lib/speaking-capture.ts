import { encodeSpeakingWav } from "./speaking-audio";

export type SpeakingCapture = { stop: () => Promise<Blob>; cancel: () => Promise<void> };

export async function beginSpeakingCapture(onLevel: (level: number) => void, onInterrupted: () => void): Promise<SpeakingCapture> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Le microphone nécessite un navigateur compatible et une connexion sécurisée.");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  let context: AudioContext | undefined;
  try {
    context = new AudioContext({ sampleRate: 16000 });
    await context.resume();
    await context.audioWorklet.addModule("/speaking-capture-worklet.js");
    const ctx = context;
    const source = ctx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(ctx, "speaking-capture");
    const mute = ctx.createGain();
    mute.gain.value = 0;
    const chunks: Float32Array[] = [];
    let finished = false;
    let finish: (() => void) | undefined;
    node.port.onmessage = (event: MessageEvent<{ pcm?: Float32Array; stopped?: boolean }>) => {
      if (event.data.pcm) {
        chunks.push(event.data.pcm);
        const energy = event.data.pcm.reduce((s, x) => s + x * x, 0) / event.data.pcm.length;
        onLevel(Math.min(1, Math.sqrt(energy) * 3));
      }
      if (event.data.stopped) finish?.();
    };
    source.connect(node); node.connect(mute); mute.connect(ctx.destination);
    const interrupt = () => { if (!finished) onInterrupted(); };
    for (const track of stream.getTracks()) track.addEventListener("ended", interrupt);
    ctx.onstatechange = () => { if (ctx.state === "suspended") interrupt(); };
    const release = async () => {
      finished = true;
      ctx.onstatechange = null;
      stream.getTracks().forEach((track) => { track.removeEventListener("ended", interrupt); track.stop(); });
      node.disconnect(); source.disconnect(); mute.disconnect(); node.port.onmessage = null;
      await ctx.close();
    };
    return {
      async stop() {
        if (finished) throw new Error("Enregistrement déjà arrêté.");
        finished = true;
        // Port messages are ordered: all PCM, including the tail, precede the acknowledgement.
        if (ctx.state !== "running") await ctx.resume();
        await new Promise<void>((resolve) => { finish = resolve; node.port.postMessage("stop"); });
        const blob = encodeSpeakingWav(chunks, ctx.sampleRate);
        await release();
        if (blob.size <= 44) throw new Error("Aucun son enregistré. Réessayez.");
        return blob;
      },
      async cancel() { if (!finished) await release(); },
    };
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    await context?.close();
    throw error;
  }
}