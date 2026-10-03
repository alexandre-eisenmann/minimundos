/** Quiet, gesture-unlocked game-show cues. No downloaded audio or looping music. */
export class StudioSound {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = false;
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.context && this.master)
      this.master.gain.setTargetAtTime(
        enabled ? 0.12 : 0,
        this.context.currentTime,
        0.025,
      );
  }
  unlock() {
    if (!this.enabled) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.12;
        this.master.connect(this.context.destination);
      }
      void this.context.resume().catch(() => {});
    } catch {
      /* Audio remains optional when unavailable. */
    }
  }
  play(cue: 'reveal' | 'ready' | 'win' | 'goat') {
    const ctx = this.context,
      master = this.master;
    if (!this.enabled || !ctx || !master || ctx.state !== 'running') return;
    const notes =
      cue === 'win'
        ? [523, 659, 784, 1047]
        : cue === 'ready'
          ? [523, 784]
          : cue === 'goat'
            ? [294, 220]
            : [196, 247];
    notes.forEach((frequency, index) => {
      const start = ctx.currentTime + index * 0.13;
      const tone = ctx.createOscillator(),
        gain = ctx.createGain();
      tone.type = 'triangle';
      tone.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.5, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);
      tone.connect(gain).connect(master);
      tone.start(start);
      tone.stop(start + 0.34);
      tone.onended = () => {
        tone.disconnect();
        gain.disconnect();
      };
    });
  }
  dispose() {
    void this.context?.close().catch(() => {});
    this.context = null;
    this.master = null;
  }
}
