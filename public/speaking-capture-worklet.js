class SpeakingCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = [];
    this.stopped = false;
    this.port.onmessage = (event) => {
      if (event.data === 'stop') {
        this.flush();
        this.stopped = true;
        this.port.postMessage({ stopped: true });
      }
    };
  }
  flush() {
    if (!this.samples.length) return;
    const pcm = new Float32Array(this.samples);
    this.samples = [];
    this.port.postMessage({ pcm }, [pcm.buffer]);
  }
  process(inputs) {
    if (this.stopped) return false;
    const input = inputs[0]?.[0];
    if (input) {
      for (const value of input) this.samples.push(value);
      if (this.samples.length >= 4096) this.flush();
    }
    return true;
  }
}
registerProcessor('speaking-capture', SpeakingCapture);