import { describe, expect, it } from 'vitest';
import { noiseSamples, soundMix, type SoundState } from '../lib/flight/audio';
const flying: SoundState = {
  phase: 'flight',
  speed: 2,
  throttle: 0.7,
  altitude: 10,
  atmosphere: true,
  coastal: false,
  boost: false,
  pulse: false,
  autopilot: false,
  walked: 0,
  gear: 0,
  time: 0,
};
describe('expedition soundscape', () => {
  it('separates vacuum flight, atmospheric motion, and surface ambience', () => {
    const air = soundMix(flying),
      space = soundMix({ ...flying, altitude: 300 });
    expect(air.engine).toBeGreaterThan(0);
    expect(air.wind).toBeGreaterThan(0);
    expect(space.wind).toBe(0);
    expect(space.engine).toBe(air.engine);
    const ground = soundMix({ ...flying, phase: 'walking', coastal: true });
    expect(ground.engine).toBe(0);
    expect(ground.surf).toBeGreaterThan(0);
    expect(soundMix({ ...flying, phase: 'restoring' }).wind).toBe(0);
    expect(
      soundMix({ ...flying, phase: 'landed', coastal: true }).surf,
    ).toBeLessThan(ground.surf);
  });
  it('adds distinct boost, pulse and mechanical layers without leaving them active at rest', () => {
    const base = soundMix(flying),
      boost = soundMix({ ...flying, boost: true }),
      pulse = soundMix({ ...flying, pulse: true });
    expect(boost.engine).toBeGreaterThan(base.engine);
    expect(boost.frequency).toBeGreaterThan(base.frequency);
    expect(pulse.pulse).toBeGreaterThan(base.pulse);
    expect(soundMix({ ...flying, gear: 0.5 }).gear).toBeGreaterThan(0);
    expect(soundMix({ ...flying, gear: 1 }).gear).toBe(0);
    expect(soundMix({ ...flying, phase: 'landed', pulse: true }).pulse).toBe(0);
  });
  it('provides deterministic centered noise with headroom and no DC bias', () => {
    const samples = noiseSamples(48000);
    const mean = samples.reduce((sum, v) => sum + v, 0) / samples.length;
    expect(Math.abs(mean)).toBeLessThan(0.01);
    expect(Math.max(...samples)).toBeLessThanOrEqual(1);
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(-1);
    expect(samples.slice(0, 64)).toEqual(noiseSamples(64));
  });
});
