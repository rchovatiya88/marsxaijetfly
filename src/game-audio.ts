class GameAudio {
  private volume = 0.7;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambient: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;

  private getContext(): AudioContext | null {
    if (this.context) return this.context;
    const AudioCtor = (typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null);
    if (!AudioCtor) return null;
    this.context = new AudioCtor();
    this.master = this.context.createGain();
    this.master.gain.value = this.volume * 0.85;
    this.master.connect(this.context.destination);
    return this.context;
  }

  resume(): void {
    const context = this.getContext();
    if (!context) return;
    void context.resume?.().catch(() => {});
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.master) this.master.gain.value = this.volume * 0.85;
  }

  pause(): void {
    if (this.context?.state === 'running') void this.context.suspend().catch(() => {});
  }

  startAmbient(): void {
    const context = this.getContext();
    if (!context || !this.master || this.ambient) return;
    this.ambient = context.createOscillator();
    this.ambientGain = context.createGain();
    this.ambient.type = 'sawtooth';
    this.ambient.frequency.value = 42;
    this.ambientGain.gain.value = 0.08;
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

  setEngineThrottle(speed: number, isBoost: boolean): void {
    if (!this.ambient || !this.context) return;
    const baseFreq = 42;
    const targetFreq = Math.min(220, baseFreq + Math.max(0, speed) * 3.8 + (isBoost ? 50 : 0));
    const targetGain = Math.min(0.20, 0.08 + (Math.max(0, speed) / 30) * 0.08 + (isBoost ? 0.04 : 0));
    const now = this.context.currentTime;
    try {
      this.ambient.frequency.setTargetAtTime(targetFreq, now, 0.08);
      if (this.ambientGain) {
        this.ambientGain.gain.setTargetAtTime(targetGain, now, 0.08);
      }
    } catch {
      // Ignore if audio context state changed
    }
  }

  pulse(kind: 'shot' | 'hit' | 'kill' | 'reload' | 'boost' | 'damage' | 'secure' | 'beacon'): void {
    const context = this.getContext();
    if (!context || !this.master) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    const settings = {
      shot: { type: 'square' as OscillatorType, start: 960, end: 300, gain: 0.28, length: 0.09, filter: 2400 },
      hit: { type: 'triangle' as OscillatorType, start: 480, end: 1100, gain: 0.32, length: 0.12, filter: 3000 },
      kill: { type: 'sawtooth' as OscillatorType, start: 160, end: 48, gain: 0.48, length: 0.32, filter: 1100 },
      reload: { type: 'triangle' as OscillatorType, start: 260, end: 500, gain: 0.20, length: 0.16, filter: 1800 },
      boost: { type: 'sawtooth' as OscillatorType, start: 110, end: 210, gain: 0.18, length: 0.20, filter: 850 },
      damage: { type: 'square' as OscillatorType, start: 120, end: 60, gain: 0.32, length: 0.18, filter: 700 },
      secure: { type: 'sine' as OscillatorType, start: 587.33, end: 1174.66, gain: 0.28, length: 0.34, filter: 3600 },
      beacon: { type: 'triangle' as OscillatorType, start: 520, end: 1040, gain: 0.26, length: 0.28, filter: 3000 }
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
    oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  attachGlobalUnlock(): void {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    const unlock = () => {
      this.resume();
      this.startAmbient();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  }
}

export const gameAudio = new GameAudio();
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  gameAudio.attachGlobalUnlock();
}

