class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambient: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;

  private getContext(): AudioContext | null {
    if (this.context) return this.context;
    const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtor) return null;
    this.context = new AudioCtor();
    this.master = this.context.createGain();
    this.master.gain.value = 0.24;
    this.master.connect(this.context.destination);
    return this.context;
  }

  resume(): void {
    const context = this.getContext();
    if (!context) return;
    context.resume?.();
  }

  startAmbient(): void {
    const context = this.getContext();
    if (!context || !this.master || this.ambient) return;
    this.ambient = context.createOscillator();
    this.ambientGain = context.createGain();
    this.ambient.type = 'sawtooth';
    this.ambient.frequency.value = 42;
    this.ambientGain.gain.value = 0.018;
    this.ambient.connect(this.ambientGain);
    this.ambientGain.connect(this.master);
    this.ambient.start();
  }

  stopAmbient(): void {
    this.ambient?.stop();
    this.ambient?.disconnect();
    this.ambientGain?.disconnect();
    this.ambient = null;
    this.ambientGain = null;
  }

  pulse(kind: 'shot' | 'hit' | 'kill' | 'reload' | 'boost' | 'damage'): void {
    const context = this.getContext();
    if (!context || !this.master) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    const settings = {
      shot: { type: 'square' as OscillatorType, start: 760, end: 260, gain: 0.09, length: 0.08, filter: 1800 },
      hit: { type: 'triangle' as OscillatorType, start: 420, end: 920, gain: 0.11, length: 0.12, filter: 2600 },
      kill: { type: 'sawtooth' as OscillatorType, start: 140, end: 54, gain: 0.18, length: 0.28, filter: 900 },
      reload: { type: 'triangle' as OscillatorType, start: 220, end: 420, gain: 0.07, length: 0.16, filter: 1600 },
      boost: { type: 'sawtooth' as OscillatorType, start: 90, end: 150, gain: 0.05, length: 0.18, filter: 700 },
      damage: { type: 'square' as OscillatorType, start: 110, end: 70, gain: 0.13, length: 0.18, filter: 600 }
    }[kind];

    oscillator.type = settings.type;
    filter.type = 'lowpass';
    filter.frequency.value = settings.filter;
    oscillator.frequency.setValueAtTime(settings.start, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, settings.end), now + settings.length);
    gain.gain.setValueAtTime(settings.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + settings.length);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + settings.length + 0.02);
  }
}

export const gameAudio = new GameAudio();
