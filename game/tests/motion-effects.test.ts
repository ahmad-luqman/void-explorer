import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3, Mesh, LineSegments } from 'three';
import {
  MotionEffects,
  motionProfile,
  type MotionInput,
} from '../lib/flight/motion-effects';
const input = (): MotionInput => ({
  elapsed: 0,
  speed: 0.6,
  density: 1,
  pulse: false,
  active: true,
  orientation: new Quaternion(),
  angularVelocity: new Vector3(),
});
describe('flight motion feedback', () => {
  it('separates slow atmospheric motion, cruise and pulse without stationary streaks', () => {
    expect(motionProfile(0, 1, false).opacity).toBe(0);
    expect(motionProfile(0.5, 1, false).opacity).toBeGreaterThan(0.1);
    expect(motionProfile(0.5, 0, false).opacity).toBe(0);
    expect(motionProfile(24000, 0, true).opacity).toBeGreaterThan(
      motionProfile(1100, 0, false).opacity,
    );
    expect(motionProfile(24000, 0, true).vapor).toBe(0);
  });
  it('advances continuously at speed changes and freezes while simulation time is paused', () => {
    const fx = new MotionEffects(),
      state = input();
    fx.update(state, false);
    state.elapsed = 0.1;
    fx.update(state, false);
    const before = fx.stats.phase;
    state.speed = 1;
    fx.update(state, false);
    expect(fx.stats.phase).toBe(before);
    const geometry = (fx.group.children[0] as LineSegments).geometry;
    const positions = geometry.attributes.position.array.slice();
    const frozen = { ...fx.stats };
    fx.update(state, false);
    expect(fx.stats).toEqual(frozen);
    expect(geometry.attributes.position.array).toEqual(positions);
    state.elapsed = 0;
    fx.update(state, false);
    expect(fx.stats.phase).toBe(0);
    state.active = false;
    fx.update(state, false);
    expect(fx.group.visible).toBe(false);
    expect(fx.stats.streaks).toBe(0);
  });
  it('keeps frame-rate response and geometry cost bounded on both quality levels', () => {
    const results = [20, 30, 60, 144].map((hz) => {
      const fx = new MotionEffects(),
        state = input();
      fx.update(state, false);
      for (let i = 1; i <= hz; i++) {
        state.elapsed = i / hz;
        fx.update(state, false);
      }
      const lines = fx.group.children[0] as LineSegments;
      const vapor = fx.group.children[1] as Mesh;
      expect(lines.geometry.drawRange.count).toBe(360);
      expect(vapor.geometry.index!.count / 3).toBe(192);
      expect(
        [...vapor.geometry.attributes.position.array].every(Number.isFinite),
      ).toBe(true);
      fx.update(state, true);
      expect(lines.geometry.drawRange.count).toBe(180);
      return fx.stats;
    });
    for (const value of results) {
      expect(value.phase).toBeCloseTo(results[0].phase, 10);
      expect(value.streaks).toBeCloseTo(results[0].streaks, 10);
      expect(value.vapor).toBeCloseTo(results[0].vapor, 10);
    }
  });
});
