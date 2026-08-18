export type SoundName =
  | "click"
  | "draw"
  | "pair"
  | "discard"
  | "turn"
  | "win"
  | "lose";

export interface AudioSettings {
  soundOn: boolean;
  musicOn: boolean;
}

/**
 * Minimal Web Audio API sound layer. No external audio files — all effects
 * are synthesized, so the bundle stays tiny.
 *
 * The AudioContext is created lazily on the first user gesture (click/touch)
 * to satisfy browser autoplay policies.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private soundGain: GainNode | null = null;
  private muted = false;

  private settings: AudioSettings = { soundOn: true, musicOn: true };

  constructor() {
    // Unlock audio on the first user gesture.
    const unlock = () => {
      this.ensureContext();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  }

  setSettings(settings: AudioSettings): void {
    this.settings = { ...settings };
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(
        muted ? 0 : 1,
        this.ctx!.currentTime,
        0.02,
      );
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);

      this.soundGain = this.ctx.createGain();
      this.soundGain.gain.value = this.settings.soundOn ? 1 : 0;
      this.soundGain.connect(this.master);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.settings.musicOn ? 1 : 0;
      this.musicGain.connect(this.master);

      return this.ctx;
    } catch {
      this.ctx = null;
      return null;
    }
  }

  /** Must be called from a user gesture (pointerdown/keydown). */
  unlock(): void {
    this.ensureContext();
  }

  /** Synthesized click. */
  playClick(): void {
    this.playSound("click");
  }

  playSound(name: SoundName): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.soundGain) return;
    if (!this.settings.soundOn) return;

    const now = ctx.currentTime;

    switch (name) {
      case "click": {
        this.tone(ctx, 700, now, 0.06, "square", 0.12, 820);
        break;
      }
      case "draw": {
        this.tone(ctx, 380, now, 0.14, "triangle", 0.18, 560);
        break;
      }
      case "pair": {
        this.tone(ctx, 620, now, 0.1, "triangle", 0.16, 720);
        this.tone(ctx, 860, now + 0.08, 0.12, "triangle", 0.16, 960);
        break;
      }
      case "discard": {
        this.noiseBurst(ctx, now, 0.12, 0.1);
        break;
      }
      case "turn": {
        this.tone(ctx, 480, now, 0.08, "sine", 0.1, 600);
        break;
      }
      case "win": {
        this.tone(ctx, 523.25, now, 0.14, "triangle", 0.2);
        this.tone(ctx, 659.25, now + 0.12, 0.14, "triangle", 0.2);
        this.tone(ctx, 783.99, now + 0.24, 0.2, "triangle", 0.22);
        break;
      }
      case "lose": {
        this.tone(ctx, 330, now, 0.18, "sine", 0.18, 210);
        this.tone(ctx, 220, now + 0.15, 0.28, "sine", 0.18, 140);
        break;
      }
    }
  }

  private tone(
    ctx: AudioContext,
    freq: number,
    start: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    endFreq?: number,
  ): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
    }
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(g);
    g.connect(this.soundGain!);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private noiseBurst(ctx: AudioContext, start: number, duration: number, gain: number): void {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(g);
    g.connect(this.soundGain!);
    src.start(start);
  }
}