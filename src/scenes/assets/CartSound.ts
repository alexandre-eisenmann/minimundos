/** Motion-driven wooden cart wheels and cable winch. No looping audio downloads. */
type Voice = {
  roll: GainNode; haul: GainNode; filter: BiquadFilterNode;
  creak: OscillatorNode; pan: StereoPannerNode; distance: number;
};

export class CartSound {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private voices: Voice[] = [];
  private enabled = false;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(enabled ? 0.65 : 0, this.context.currentTime, 0.035);
    }
  }

  unlock() {
    if (!this.enabled) return;
    try {
      if (!this.context) {
        const ctx = new AudioContext();
        this.context = ctx;
        const master = ctx.createGain();
        this.master = master;
        master.gain.value = 0.65;
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -18;
        limiter.ratio.value = 5;
        master.connect(limiter).connect(ctx.destination);
        const noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
        const samples = noise.getChannelData(0);
        let brown = 0;
        for (let i = 0; i < samples.length; i++) {
          const white = Math.random() * 2 - 1;
          brown = (brown + white * 0.035) / 1.035;
          samples[i] = brown * 2 + white * 0.22;
        }
        this.noise = noise;
        this.voices = Array.from({ length: 3 }, (_, lane) => {
          const pan = ctx.createStereoPanner();
          pan.connect(master);
          const roll = ctx.createGain();
          const haul = ctx.createGain();
          roll.gain.value = haul.gain.value = 0;
          roll.connect(pan);
          haul.connect(pan);
          const source = ctx.createBufferSource();
          source.buffer = noise;
          source.loop = true;
          source.playbackRate.value = 0.91 + lane * 0.07;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.Q.value = 0.65;
          source.connect(filter).connect(roll);
          source.start(0, lane * 0.7);
          // Quiet, wavering wood/rope strain underneath the winch teeth.
          const creak = ctx.createOscillator();
          creak.type = 'triangle';
          creak.connect(haul);
          creak.start();
          const wobble = ctx.createOscillator();
          const depth = ctx.createGain();
          wobble.frequency.value = 2.3 + lane * 0.19;
          depth.gain.value = 9;
          wobble.connect(depth).connect(creak.frequency);
          wobble.start();
          return { roll, haul, filter, creak, pan, distance: 0 };
        });
      }
      if (this.context.state !== 'running') {
        // Start a fresh source inside the gesture as well as resuming: mobile
        // WebKit can suspend/interrupt an already-created audio graph.
        const pulse = this.context.createBufferSource();
        pulse.buffer = this.context.createBuffer(1, 1, this.context.sampleRate);
        pulse.connect(this.context.destination);
        pulse.onended = () => pulse.disconnect();
        pulse.start();
        void this.context.resume().catch(() => {});
      }
    } catch {
      // Audio is optional on devices without Web Audio support.
      this.dispose();
    }
  }

  update(lane: number, speed: number, hauling: boolean, delta: number, pan: number, distance: number) {
    const ctx = this.context;
    const voice = this.voices[lane];
    if (!ctx || !voice || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const moving = this.enabled && speed > 0.025 && delta > 0 && delta < 0.2;
    const strength = moving ? Math.min(1, speed / 7) : 0;
    const proximity = 1 / (1 + Math.max(0, distance - 18) * 0.035);
    voice.roll.gain.setTargetAtTime(Math.sqrt(strength) * (hauling ? 0.13 : 0.24) * proximity, now, 0.06);
    voice.haul.gain.setTargetAtTime(moving && hauling ? 0.018 * proximity : 0, now, 0.09);
    voice.filter.frequency.setTargetAtTime(240 + strength * 1800, now, 0.08);
    voice.creak.frequency.setTargetAtTime(105 + lane * 11 + speed * 13, now, 0.1);
    voice.pan.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, pan)), now, 0.08);
    if (!moving) { voice.distance = 0; return; }
    voice.distance += speed * delta;
    const spacing = hauling ? 0.19 : 0.72;
    if (voice.distance < spacing) return;
    voice.distance %= spacing;
    // Wheel joints have a paired axle knock; the winch has a smaller dry tooth click.
    this.knock(voice, now, hauling, proximity * (hauling ? 0.045 : 0.07 + strength * 0.09));
    if (!hauling) this.knock(voice, now + Math.min(0.09, 0.29 / speed), false, proximity * 0.055);
  }

  private knock(voice: Voice, now: number, hauling: boolean, volume: number) {
    const ctx = this.context!;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    filter.type = 'bandpass';
    filter.frequency.value = hauling ? 1350 : 480;
    filter.Q.value = hauling ? 1.5 : 0.8;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
    source.connect(filter).connect(gain).connect(voice.pan);
    source.start(now, Math.random());
    source.stop(now + 0.08);
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.frequency.setValueAtTime(hauling ? 310 : 155, now);
    body.frequency.exponentialRampToValueAtTime(hauling ? 190 : 82, now + 0.07);
    bodyGain.gain.setValueAtTime(volume * 0.4, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    body.connect(bodyGain).connect(voice.pan);
    body.start(now);
    body.stop(now + 0.1);
    body.onended = () => { body.disconnect(); bodyGain.disconnect(); };
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  dispose() {
    void this.context?.close().catch(() => {});
    this.context = null;
    this.master = null;
    this.noise = null;
    this.voices = [];
  }
}
