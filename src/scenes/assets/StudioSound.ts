/** Quiet, gesture-unlocked game-show cues. No downloaded audio or looping music. */
export class StudioSound {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = false;
  private liftMoving = false;
  private liftGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  setLiftMoving(moving: boolean) {
    this.liftMoving = moving;
    if (this.context && this.liftGain)
      this.liftGain.gain.setTargetAtTime(
        moving ? 0.75 : 0,
        this.context.currentTime,
        moving ? 0.08 : 0.18,
      );
  }
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
        const ctx = this.context;
        this.liftGain = ctx.createGain();
        this.liftGain.gain.value = this.liftMoving ? 0.75 : 0;
        this.liftGain.connect(this.master);
        // The 74 Hz hum is felt on good speakers; the 148 Hz buzz and hiss carry on laptops.
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 620;
        filter.Q.value = 0.8;
        filter.connect(this.liftGain);
        const wobble = ctx.createOscillator();
        wobble.frequency.value = 7;
        const voices = [
          { type: 'triangle' as const, frequency: 74, level: 0.9 },
          { type: 'sawtooth' as const, frequency: 148, level: 0.28 },
        ].map(({ type, frequency, level }) => {
          const tone = ctx.createOscillator(),
            gain = ctx.createGain(),
            depth = ctx.createGain();
          tone.type = type;
          tone.frequency.value = frequency;
          gain.gain.value = level;
          depth.gain.value = frequency * 0.03;
          wobble.connect(depth).connect(tone.frequency);
          tone.connect(gain).connect(filter);
          return tone;
        });
        this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const samples = this.noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++)
          samples[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = this.noise;
        noise.loop = true;
        const hiss = ctx.createBiquadFilter(),
          hissGain = ctx.createGain();
        hiss.type = 'bandpass';
        hiss.frequency.value = 1300;
        hiss.Q.value = 0.9;
        hissGain.gain.value = 0.07;
        noise.connect(hiss).connect(hissGain).connect(this.liftGain);
        voices.forEach((voice) => voice.start());
        wobble.start();
        noise.start();
      }
      void this.context.resume().catch(() => {});
    } catch {
      /* Audio remains optional when unavailable. */
    }
  }
  play(
    cue:
      | 'reveal'
      | 'ready'
      | 'win'
      | 'goat'
      | 'liftStart'
      | 'liftArrive'
      | 'applause'
      | 'fail',
  ) {
    const ctx = this.context,
      master = this.master;
    if (!this.enabled || !ctx || !master || ctx.state !== 'running') return;
    if (cue === 'applause') return this.applause(ctx, master);
    if (cue === 'fail') return this.trombone(ctx, master);
    if (cue === 'liftStart') {
      const start = ctx.currentTime,
        tone = ctx.createOscillator(),
        gain = ctx.createGain();
      tone.type = 'sine';
      tone.frequency.setValueAtTime(150, start);
      tone.frequency.exponentialRampToValueAtTime(62, start + 0.22);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.9, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      tone.connect(gain).connect(master);
      tone.start(start);
      tone.stop(start + 0.32);
      tone.onended = () => {
        tone.disconnect();
        gain.disconnect();
      };
      return;
    }
    const notes =
      cue === 'win'
        ? [523, 659, 784, 1047]
        : cue === 'ready'
          ? [523, 784]
          : cue === 'goat'
            ? [294, 220]
            : cue === 'liftArrive'
              ? [880, 698]
              : [196, 247];
    const bell = cue === 'liftArrive',
      spacing = bell ? 0.22 : 0.13,
      decay = bell ? 0.9 : 0.32;
    notes.forEach((frequency, index) => {
      const start = ctx.currentTime + index * spacing;
      const tone = ctx.createOscillator(),
        gain = ctx.createGain();
      tone.type = bell ? 'sine' : 'triangle';
      tone.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(bell ? 0.6 : 0.5, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + decay);
      tone.connect(gain).connect(master);
      tone.start(start);
      tone.stop(start + decay + 0.02);
      tone.onended = () => {
        tone.disconnect();
        gain.disconnect();
      };
    });
  }
  /** A swelling studio audience: a crowd wash under hundreds of individual claps. */
  private applause(ctx: AudioContext, master: GainNode) {
    if (!this.noise) return;
    const start = ctx.currentTime + 0.05,
      length = 3.6;
    const wash = ctx.createBufferSource(),
      washFilter = ctx.createBiquadFilter(),
      washGain = ctx.createGain();
    wash.buffer = this.noise;
    wash.loop = true;
    washFilter.type = 'bandpass';
    washFilter.frequency.value = 1700;
    washFilter.Q.value = 0.6;
    washGain.gain.setValueAtTime(0, start);
    washGain.gain.linearRampToValueAtTime(0.32, start + 0.5);
    washGain.gain.setValueAtTime(0.32, start + length - 1.4);
    washGain.gain.linearRampToValueAtTime(0, start + length);
    wash.connect(washFilter).connect(washGain).connect(master);
    wash.start(start);
    wash.stop(start + length + 0.05);
    wash.onended = () => {
      wash.disconnect();
      washFilter.disconnect();
      washGain.disconnect();
    };
    const claps = ctx.createGain(),
      clapFilter = ctx.createBiquadFilter();
    clapFilter.type = 'bandpass';
    clapFilter.frequency.value = 1400;
    clapFilter.Q.value = 0.7;
    claps.connect(clapFilter).connect(master);
    for (let i = 0; i < 260; i++) {
      // Denser near the start, thinning as the audience settles.
      const at = start + Math.pow(Math.random(), 1.6) * (length - 0.2);
      const clap = ctx.createBufferSource(),
        gain = ctx.createGain();
      clap.buffer = this.noise;
      clap.playbackRate.value = 0.8 + Math.random() * 0.7;
      const level = 0.25 + Math.random() * 0.55;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(level, at + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.04 + Math.random() * 0.03);
      clap.connect(gain).connect(claps);
      clap.start(at, Math.random() * 0.9, 0.09);
      clap.onended = () => {
        clap.disconnect();
        gain.disconnect();
      };
    }
    setTimeout(
      () => {
        claps.disconnect();
        clapFilter.disconnect();
      },
      (length + 0.6) * 1000,
    );
  }
  /** The classic four-note sad trombone, ending in a wobbling slide. */
  private trombone(ctx: AudioContext, master: GainNode) {
    const start = ctx.currentTime + 0.05,
      notes = [
        [311, 0.38],
        [294, 0.38],
        [277, 0.38],
        [262, 1.25],
      ] as const;
    const filter = ctx.createBiquadFilter(),
      out = ctx.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;
    filter.Q.value = 2;
    out.gain.value = 0.55;
    filter.connect(out).connect(master);
    let at = start;
    notes.forEach(([frequency, duration], index) => {
      const last = index === notes.length - 1;
      const tone = ctx.createOscillator(),
        gain = ctx.createGain();
      tone.type = 'sawtooth';
      tone.frequency.setValueAtTime(frequency * 1.02, at);
      tone.frequency.linearRampToValueAtTime(frequency, at + 0.08);
      if (last) {
        const wobble = ctx.createOscillator(),
          depth = ctx.createGain();
        wobble.frequency.value = 5.5;
        depth.gain.setValueAtTime(0, at);
        depth.gain.linearRampToValueAtTime(9, at + 0.4);
        wobble.connect(depth).connect(tone.frequency);
        tone.frequency.linearRampToValueAtTime(frequency * 0.94, at + duration);
        wobble.start(at);
        wobble.stop(at + duration + 0.05);
      }
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.8, at + 0.04);
      gain.gain.setValueAtTime(0.8, at + duration - (last ? 0.5 : 0.1));
      gain.gain.linearRampToValueAtTime(0, at + duration);
      tone.connect(gain).connect(filter);
      tone.start(at);
      tone.stop(at + duration + 0.02);
      tone.onended = () => {
        tone.disconnect();
        gain.disconnect();
      };
      at += duration;
    });
    setTimeout(
      () => {
        filter.disconnect();
        out.disconnect();
      },
      (at - ctx.currentTime + 0.3) * 1000,
    );
  }
  dispose() {
    void this.context?.close().catch(() => {});
    this.context = null;
    this.master = null;
    this.liftGain = null;
    this.noise = null;
  }
}
