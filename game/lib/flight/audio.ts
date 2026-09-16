import type { SurfacePhase } from './surface';

export type SoundState = {
  phase: SurfacePhase;
  speed: number;
  throttle: number;
  altitude: number;
  atmosphere: boolean;
  coastal: boolean;
  boost: boolean;
  pulse: boolean;
  autopilot: boolean;
  walked: number;
  gear: number;
  time: number;
};
const clamp = (v: number) => Math.max(0, Math.min(1, v));
export function soundMix(s: SoundState) {
  const flying = ['flight', 'landing', 'takeoff'].includes(s.phase);
  const air = s.atmosphere ? clamp(1 - s.altitude / 130) : 0;
  const motion = Math.sqrt(clamp(s.speed / 2));
  const exterior = s.phase === 'walking' ? 1 : s.phase === 'landed' ? 0.2 : 0;
  return {
    engine: flying ? 0.026 + s.throttle * 0.036 + (s.boost ? 0.024 : 0) : 0,
    harmonic: flying ? 0.005 + s.throttle * 0.012 : 0,
    wind: air * (flying ? motion * 0.045 : 0.009 * exterior),
    surf:
      s.coastal && exterior > 0
        ? exterior * 0.012 + (0.5 + 0.5 * Math.sin(s.time * 0.43)) * 0.014
        : 0,
    gear: s.gear > 0 && s.gear < 1 ? 0.026 : 0,
    pulse: flying && s.pulse ? 0.013 : 0,
    frequency: 36 + clamp(s.throttle) * 54 + (s.boost ? 19 : 0),
    windCutoff: 240 + motion * 1600,
  };
}
export function noiseSamples(length: number) {
  const data = new Float32Array(length);
  let seed = 982451653;
  for (let i = 0; i < length; i++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    data[i] = (seed >>> 0) / 2147483648 - 1;
  }
  return data;
}

type Voice = {
  source: OscillatorNode | AudioBufferSourceNode;
  gain: GainNode;
  filter?: BiquadFilterNode;
};
export class ExpeditionAudio {
  readonly master: GainNode;
  private voices: Record<string, Voice> = {};
  private transient = new Set<AudioScheduledSourceNode>();
  private noise: AudioBuffer;
  private prior: SoundState | null = null;
  private nextStep = 0;
  private volume = 0.35;
  private active = false;
  private disposed = false;
  private mix: ReturnType<typeof soundMix> | null = null;
  readonly events: Record<string, number> = {};
  constructor(readonly ctx: BaseAudioContext = new AudioContext()) {
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 12;
    limiter.ratio.value = 5;
    this.master.connect(limiter).connect(ctx.destination);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    this.noise.copyToChannel(noiseSamples(this.noise.length), 0);
    for (const [name, type, frequency] of [
      ['engine', 'triangle', 44],
      ['harmonic', 'sine', 89],
      ['pulse', 'sine', 160],
    ] as const) {
      const source = ctx.createOscillator(),
        gain = ctx.createGain();
      source.type = type;
      source.frequency.value = frequency;
      gain.gain.value = 0;
      source.connect(gain).connect(this.master);
      source.start();
      this.voices[name] = { source, gain };
    }
    for (const [name, type, cutoff, pan] of [
      ['wind', 'lowpass', 900, -0.28],
      ['surf', 'bandpass', 380, 0.35],
      ['gear', 'bandpass', 1200, 0],
    ] as const) {
      const source = ctx.createBufferSource(),
        filter = ctx.createBiquadFilter(),
        gain = ctx.createGain(),
        panner = ctx.createStereoPanner();
      source.buffer = this.noise;
      source.loop = true;
      filter.type = type;
      filter.frequency.value = cutoff;
      filter.Q.value = 0.7;
      panner.pan.value = pan;
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(panner).connect(this.master);
      source.start(0, name === 'surf' ? 0.73 : 0);
      this.voices[name] = { source, gain, filter };
    }
  }
  resume() {
    if (this.ctx instanceof AudioContext)
      void this.ctx.resume().catch(() => {});
  }
  setVolume(percent: number) {
    this.volume = clamp(percent / 100);
    this.setActive(this.active);
  }
  setActive(active: boolean) {
    this.active = active;
    this.master.gain.setTargetAtTime(
      active ? this.volume : 0,
      this.ctx.currentTime,
      0.055,
    );
  }
  get snapshot() {
    return {
      active: this.active,
      volume: this.volume,
      context: this.ctx.state,
      mix: this.mix,
      events: { ...this.events },
    };
  }
  private cue(
    name: string,
    frequency: number,
    end: number,
    duration: number,
    gainValue: number,
    noise = false,
  ) {
    if (!this.active || this.disposed) return;
    this.events[name] = (this.events[name] ?? 0) + 1;
    const t = this.ctx.currentTime,
      gain = this.ctx.createGain();
    let source: OscillatorNode | AudioBufferSourceNode;
    if (noise) {
      const buffer = this.ctx.createBufferSource(),
        filter = this.ctx.createBiquadFilter();
      buffer.buffer = this.noise;
      filter.type = 'lowpass';
      filter.frequency.value = frequency;
      buffer.connect(filter).connect(gain);
      source = buffer;
    } else {
      const oscillator = this.ctx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, t);
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, end),
        t + duration,
      );
      oscillator.connect(gain);
      source = oscillator;
    }
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(gainValue, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);
    gain.connect(this.master);
    this.transient.add(source);
    source.onended = () => {
      this.transient.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start(t);
    source.stop(t + duration + 0.02);
  }
  update(state: SoundState, active: boolean) {
    if (this.disposed) return;
    this.setActive(active);
    const mix = soundMix(state),
      t = this.ctx.currentTime;
    this.mix = mix;
    for (const name of [
      'engine',
      'harmonic',
      'wind',
      'surf',
      'gear',
      'pulse',
    ] as const)
      this.voices[name].gain.gain.setTargetAtTime(mix[name], t, 0.12);
    (this.voices.engine.source as OscillatorNode).frequency.setTargetAtTime(
      mix.frequency,
      t,
      0.14,
    );
    (this.voices.harmonic.source as OscillatorNode).frequency.setTargetAtTime(
      mix.frequency * 2.013,
      t,
      0.17,
    );
    (this.voices.pulse.source as OscillatorNode).frequency.setTargetAtTime(
      130 + clamp(state.speed / 10000) * 90,
      t,
      0.4,
    );
    this.voices.wind.filter!.frequency.setTargetAtTime(mix.windCutoff, t, 0.2);
    if (active && this.prior) {
      const old = this.prior;
      if (state.phase === 'landed' && old.phase === 'landing')
        this.cue('touchdown', 90, 27, 0.5, 0.24);
      if (state.phase === 'takeoff' && old.phase !== 'takeoff')
        this.cue('takeoff', 42, 110, 0.7, 0.07);
      if (
        (state.phase === 'walking' && old.phase === 'landed') ||
        (state.phase === 'landed' && old.phase === 'walking')
      )
        this.cue('hatch', 700, 180, 0.35, 0.065, true);
      if (state.pulse !== old.pulse)
        this.cue(
          'pulse',
          state.pulse ? 110 : 580,
          state.pulse ? 640 : 90,
          0.8,
          0.055,
        );
      if (state.autopilot !== old.autopilot)
        this.cue(
          'navigation',
          state.autopilot ? 440 : 660,
          state.autopilot ? 660 : 330,
          0.16,
          0.03,
        );
      if (state.boost && !old.boost)
        this.cue('boost', 500, 100, 0.45, 0.09, true);
      if (
        state.phase === 'walking' &&
        old.phase === 'walking' &&
        state.walked >= this.nextStep
      ) {
        this.cue(
          'footstep',
          650 + ((this.events.footstep ?? 0) % 2) * 170,
          100,
          0.12,
          0.12,
          true,
        );
        this.nextStep = state.walked + 0.00135;
      }
    }
    if (!active || state.phase !== 'walking' || this.prior?.phase !== 'walking')
      this.nextStep = state.walked + 0.00135;
    // No stale transition sound or burst of old footsteps after pause/restoration.
    this.prior = { ...state };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const voice of Object.values(this.voices)) {
      voice.source.stop();
      voice.source.disconnect();
      voice.gain.disconnect();
      voice.filter?.disconnect();
    }
    for (const source of this.transient) source.stop();
    this.transient.clear();
    this.master.disconnect();
    if (this.ctx instanceof AudioContext) void this.ctx.close();
  }
}
