import { difference } from '../lib/flight/coordinates';
import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import {
  createUniverse,
  elevation,
  surfaceRadius,
  SYSTEM_COUNT,
} from '../lib/flight/universe';
import { FlightSimulation, emptyControls } from '../lib/flight/simulation';
function advance(
  sim: FlightSimulation,
  seconds: number,
  controls = emptyControls(),
) {
  for (let i = 0; i < seconds * 60; i++) sim.step(1 / 60, controls);
}

describe('procedural universe', () => {
  it('recreates all reachable destinations deterministically', () => {
    const a = createUniverse(),
      b = createUniverse();
    expect(a).toEqual(b);
    expect(a.length).toBe(SYSTEM_COUNT);
    const ids = a.flatMap((s) => [s.star.id, ...s.planets.map((p) => p.id)]);
    expect(new Set(ids).size).toBe(SYSTEM_COUNT * 4);
  });
  it('samples finite, reproducible terrain with sea-level collision', () => {
    const planet = createUniverse()[0].planets[0];
    let land = 0,
      water = 0;
    for (let i = 0; i < 100; i++) {
      const dir = new Vector3(
        Math.sin(i),
        Math.cos(i * 2),
        Math.sin(i * 3),
      ).normalize();
      const h = elevation(dir, planet);
      expect(h).toBe(elevation(dir, planet));
      expect(Number.isFinite(h)).toBe(true);
      expect(surfaceRadius(dir, planet)).toBeGreaterThanOrEqual(planet.radius);
      if (h > 0) land++;
      else water++;
    }
    expect(land).toBeGreaterThan(10);
    expect(water).toBeGreaterThan(10);
  });
});
describe('continuous flight', () => {
  it('accelerates, changes physical position, and brakes to a stop', () => {
    const s = new FlightSimulation(),
      start = s.position.clone(),
      c = emptyControls();
    c.accelerate = true;
    advance(s, 2, c);
    expect(s.speed).toBeGreaterThan(100);
    expect(s.position.distanceTo(start)).toBeGreaterThan(50);
    c.accelerate = false;
    c.brake = true;
    advance(s, 2, c);
    expect(s.speed).toBeLessThan(0.001);
    expect(s.throttle).toBe(0);
  });
  it('steers and preserves a normalized orientation', () => {
    const s = new FlightSimulation(),
      before = s.orientation.clone(),
      c = emptyControls();
    c.pitch = 0.5;
    c.yaw = 0.6;
    c.roll = 0.8;
    advance(s, 3, c);
    expect(s.orientation.angleTo(before)).toBeGreaterThan(0.2);
    expect(s.orientation.length()).toBeCloseTo(1, 8);
  });
  it('descends from orbit to a safe surface hover without teleporting', () => {
    const s = new FlightSimulation();
    s.descend();
    let atmosphere = false;
    for (let i = 0; i < 60 * 45; i++) {
      const before = s.position.clone();
      s.step(1 / 60, emptyControls());
      expect(s.position.distanceTo(before)).toBeLessThan(5);
      expect(s.altitude).toBeGreaterThanOrEqual(4.99);
      if (s.status === 'ATMOSPHERE') atmosphere = true;
    }
    expect(atmosphere).toBe(true);
    expect(s.altitude).toBeLessThan(16);
    expect(s.speed).toBeLessThan(1);
  });
  it('prevents ground penetration with full throttle and pulse enabled', () => {
    const s = new FlightSimulation();
    s.position.set(0, 0, 1300);
    s.face(s.target.position);
    s.pulse = true;
    const c = emptyControls();
    c.accelerate = true;
    let minimum = Infinity;
    for (let i = 0; i < 60 * 30; i++) {
      s.step(1 / 60, c);
      minimum = Math.min(minimum, s.altitude);
    }
    expect(minimum).toBeGreaterThanOrEqual(4.99);
  });
  it('flies to a distant star and enters its system continuously', () => {
    const s = new FlightSimulation();
    s.select('s8');
    s.pulse = true;
    s.engage();
    const destination = s.target.address!;
    let maxStep = 0;
    for (let i = 0; i < 60 * 180; i++) {
      const before = s.address;
      s.step(1 / 60, emptyControls());
      const travel = difference(s.address, before).length();
      expect(travel).toBeLessThanOrEqual(5e12 / 60 + 0.01);
      maxStep = Math.max(maxStep, travel);
      if (!s.autopilot && s.speed < 0.1) break;
    }
    expect(s.activeSystem.id).toBe(8);
    expect(s.visited.has(8)).toBe(true);
    expect(difference(s.address, destination).length()).toBeLessThan(
      s.target.radius * 3,
    );
    expect(maxStep).toBeGreaterThan(1e9);
    expect(s.originRevision).toBeGreaterThan(10);
  });
  it('manual braking cancels navigation and pulse drive', () => {
    const s = new FlightSimulation();
    s.pulse = true;
    s.descend();
    const c = emptyControls();
    c.brake = true;
    s.step(1 / 60, c);
    expect(s.autopilot).toBe(false);
    expect(s.descending).toBe(false);
    expect(s.pulse).toBe(false);
  });
});
