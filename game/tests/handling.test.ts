import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { FlightSimulation, emptyControls } from '../lib/flight/simulation';
import {
  flightFieldOfView,
  response,
  steerFlight,
} from '../lib/flight/handling';

describe('flight response', () => {
  const sequence = (fps: number) => {
    const q = new Quaternion(),
      velocity = new Vector3();
    let fov = 60;
    for (let i = 0; i < 2 * fps; i++) {
      steerFlight(
        q,
        velocity,
        {
          pitch: i < fps ? 0.6 : 0,
          yaw: i < fps ? -0.4 : 0,
          roll: i < fps ? 0.8 : 0,
          brake: false,
        },
        1 / fps,
      );
      fov +=
        (flightFieldOfView(1400, false, false) - fov) * response(3.8, 1 / fps);
    }
    return { q, velocity, fov };
  };
  it('has the same turn, release and camera zoom at 20, 30, 60 and 144 Hz', () => {
    const reference = sequence(144);
    for (const fps of [20, 30, 60]) {
      const result = sequence(fps);
      expect(result.q.angleTo(reference.q)).toBeLessThan(1e-6);
      expect(result.velocity.distanceTo(reference.velocity)).toBeLessThan(
        1e-10,
      );
      expect(result.fov).toBeCloseTo(reference.fov, 10);
    }
  });
  it('eases into a turn, arrests drift on release, and bounds overlapping controls', () => {
    const q = new Quaternion(),
      velocity = new Vector3();
    steerFlight(q, velocity, { pitch: 3, yaw: 0, roll: 0, brake: false }, 0.05);
    expect(velocity.x).toBeGreaterThan(0);
    expect(velocity.x).toBeLessThan(0.5);
    for (let i = 0; i < 10; i++)
      steerFlight(
        q,
        velocity,
        { pitch: 0, yaw: 0, roll: 0, brake: false },
        0.05,
      );
    expect(velocity.length()).toBeLessThan(0.001);
    expect(q.length()).toBeCloseTo(1, 12);
    expect(flightFieldOfView(5e12, false, false)).toBe(77);
    expect(flightFieldOfView(5e12, false, true)).toBe(60);
  });
  it('clears angular drift for autopilot, resets, and surface operations', () => {
    const sim = new FlightSimulation();
    sim.step(0.05, { ...emptyControls(), yaw: 1 });
    expect(sim.angularVelocity.length()).toBeGreaterThan(0);
    sim.engage();
    sim.step(0.05, emptyControls());
    expect(sim.angularVelocity.length()).toBe(0);
    sim.step(0.05, { ...emptyControls(), yaw: -1 });
    sim.reset();
    expect(sim.angularVelocity.length()).toBe(0);
    sim.angularVelocity.set(1, 1, 1);
    sim.surface.phase = 'restoring';
    sim.step(0.05, emptyControls());
    expect(sim.angularVelocity.length()).toBe(0);
  });
});
