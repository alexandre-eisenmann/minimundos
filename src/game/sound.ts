import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'minimundos.sound-enabled-v2';
const CHANGE_EVENT = 'minimundos:sound-change';

function readPreference() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === 'true';
  } catch {
    // Fall through to the device default when storage is unavailable.
  }
  return !window.matchMedia('(max-width: 850px)').matches;
}

export function useSoundPreference() {
  const [enabled, setEnabledState] = useState(readPreference);

  useEffect(() => {
    const updateFromStorage = () => setEnabledState(readPreference());
    const updateFromPage = (event: Event) =>
      setEnabledState((event as CustomEvent<boolean>).detail);
    window.addEventListener('storage', updateFromStorage);
    window.addEventListener(CHANGE_EVENT, updateFromPage);
    return () => {
      window.removeEventListener('storage', updateFromStorage);
      window.removeEventListener(CHANGE_EVENT, updateFromPage);
    };
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // The preference still works for this page when storage is unavailable.
    }
    setEnabledState(value);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: value }));
  }, []);

  return [enabled, setEnabled] as const;
}

export class FootstepPlayer {
  private context: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private lastGaitPhase = 0;
  private alternatingStep = 1;
  private unavailable = false;

  prepare() {
    this.ensureContext();
  }

  unlock() {
    const context = this.ensureContext();
    if (!context || context.state === 'closed') return;

    // Keep this source inside every gesture: iOS may return an AudioContext to
    // its non-standard "interrupted" state after locking or changing apps.
    const pulse = context.createOscillator();
    const pulseGain = context.createGain();
    pulse.frequency.value = 40;
    pulseGain.gain.value = 0.0001;
    pulse.connect(pulseGain).connect(context.destination);
    pulse.start();
    pulse.stop(context.currentTime + 0.02);

    if (context.state !== 'running') void context.resume().catch(() => {});
  }

  update(time: number, walking: boolean, onBridge: boolean) {
    // HumanCharacter uses sin(time * 11); each extremum is one planted foot.
    const gaitPhase = Math.floor((time * 11 - Math.PI / 2) / Math.PI);
    if (!walking) {
      this.lastGaitPhase = gaitPhase;
      return;
    }

    if (gaitPhase === this.lastGaitPhase) return;
    this.lastGaitPhase = gaitPhase;
    this.play(onBridge);
  }

  dispose() {
    void this.context?.close().catch(() => {});
    this.context = null;
    this.noise = null;
  }

  private ensureContext() {
    if (this.unavailable) return null;
    if (!this.context) {
      try {
        this.context = new AudioContext();
        const sampleCount = Math.floor(this.context.sampleRate * 0.09);
        this.noise = this.context.createBuffer(1, sampleCount, this.context.sampleRate);
        const samples = this.noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) {
          const fade = 1 - i / samples.length;
          samples[i] = (Math.random() * 2 - 1) * fade * fade;
        }
      } catch {
        this.unavailable = true;
        return null;
      }
    }
    return this.context;
  }

  private play(onBridge: boolean) {
    const context = this.ensureContext();
    if (!context || !this.noise || context.state !== 'running') return;

    const now = context.currentTime;
    const output = context.createGain();
    const pan = context.createStereoPanner();
    pan.pan.value = this.alternatingStep * 0.1;
    this.alternatingStep *= -1;
    output.gain.setValueAtTime(0.0001, now);
    output.gain.exponentialRampToValueAtTime(onBridge ? 0.036 : 0.035, now + 0.005);
    output.gain.exponentialRampToValueAtTime(0.0001, now + (onBridge ? 0.14 : 0.11));
    output.connect(pan).connect(context.destination);

    const texture = context.createBufferSource();
    const filter = context.createBiquadFilter();
    texture.buffer = this.noise;
    texture.playbackRate.value = 0.93 + Math.random() * 0.14;
    filter.type = onBridge ? 'highpass' : 'lowpass';
    filter.frequency.value = onBridge ? 900 + Math.random() * 240 : 310 + Math.random() * 70;
    filter.Q.value = onBridge ? 0.8 : 0.7;
    texture.connect(filter).connect(output);
    texture.start(now);
    texture.stop(now + 0.1);

    if (onBridge) {
      // Two softly detuned modes give the heel strike a short, hollow plank body.
      this.playResonance(output, now, 145 + Math.random() * 18, 0.019, 0.14);
      this.playResonance(output, now, 265 + Math.random() * 28, 0.008, 0.09);
    } else {
      this.playResonance(output, now, 76 + Math.random() * 6, 0.024, 0.07);
    }
  }

  private playResonance(
    destination: AudioNode,
    now: number,
    frequency: number,
    volume: number,
    decay: number,
  ) {
    const context = this.context;
    if (!context) return;
    const tone = context.createOscillator();
    const gain = context.createGain();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(frequency, now);
    tone.frequency.exponentialRampToValueAtTime(frequency * 0.78, now + decay);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    tone.connect(gain).connect(destination);
    tone.start(now);
    tone.stop(now + decay);
  }
}
