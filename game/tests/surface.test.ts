import { toPlanet } from '../lib/flight/rotation';
import { describe, it, expect } from 'vitest';
import { Ray, Vector3 } from 'three';
import { FlightSimulation, emptyControls } from '../lib/flight/simulation';
import {
  ContactSurface,
  generateContact,
  EYE_HEIGHT,
  GEAR_HEIGHT,
} from '../lib/flight/contact';
function advance(s: FlightSimulation, seconds: number, c = emptyControls()) {
  for (let i = 0; i < seconds * 60; i++) s.step(1 / 60, c);
}
function prepare() {
  const sim = new FlightSimulation();
  sim.descend();
  advance(sim, 40);
  const body = sim.nearest,
    dir = sim.position.clone().sub(body.position).normalize();
  const patch = new ContactSurface(generateContact(body, dir), body);
  sim.surface.setPatch(patch);
  return { sim, patch };
}
describe('surface contact and expedition', () => {
  it('uses the rendered triangles for exact foot placement', () => {
    const { sim, patch } = prepare();
    const sample = patch.sample(sim.position)!;
    expect(sample.slope).toBeLessThan(12);
    const p = sample.point
      .clone()
      .sub(patch.origin)
      .applyQuaternion(patch.rotation.clone().invert());
    const localUp = new Vector3().fromArray(patch.data.up);
    const ray = new Ray(
      p.clone().addScaledVector(localUp, 1),
      localUp.clone().negate(),
    );
    let distance = Infinity;
    const d = patch.data;
    for (let i = 0; i < d.indices.length; i += 3) {
      const hit = ray.intersectTriangle(
        new Vector3().fromArray(d.positions, d.indices[i] * 3),
        new Vector3().fromArray(d.positions, d.indices[i + 1] * 3),
        new Vector3().fromArray(d.positions, d.indices[i + 2] * 3),
        false,
        new Vector3(),
      );
      if (hit) distance = Math.min(distance, hit.distanceTo(p));
    }
    expect(distance).toBeLessThan(1e-7);
  });
  it('flies down, lands, walks, boards, and takes off without moving the parked ship relative to terrain', () => {
    const { sim, patch } = prepare();
    expect(sim.surface.land()).toBe(true);
    const previous = sim.position.clone();
    for (let i = 0; i < 60 * 15; i++) {
      sim.step(1 / 60, emptyControls());
      expect(sim.position.distanceTo(previous)).toBeLessThan(0.7);
      previous.copy(sim.position);
    }
    expect(sim.surface.phase).toBe('landed');
    const parked = sim.position.clone();
    const localParked = toPlanet(parked, sim.nearest);
    expect(patch.sample(parked)!.point.distanceTo(parked)).toBeCloseTo(
      GEAR_HEIGHT,
      3,
    );
    expect(sim.surface.exit()).toBe(true);
    expect(sim.surface.phase).toBe('walking');
    const before = sim.position.clone(),
      c = emptyControls();
    c.decelerate = true;
    advance(sim, 5, c);
    expect(sim.position.distanceTo(before)).toBeGreaterThan(0.018);
    expect(
      toPlanet(sim.surface.shipPosition, sim.nearest).distanceTo(localParked),
    ).toBeLessThan(1e-7);
    expect(
      sim.position.distanceTo(patch.sample(sim.position)!.point),
    ).toBeCloseTo(EYE_HEIGHT, 6);
    expect(sim.surface.board()).toBe(true);
    expect(
      toPlanet(sim.position, sim.nearest).distanceTo(localParked),
    ).toBeLessThan(1e-7);
    expect(sim.surface.takeoff()).toBe(true);
    advance(sim, 2.3);
    expect(sim.surface.phase).toBe('flight');
    expect(sim.altitude).toBeGreaterThan(0.11);
    const atRelease = toPlanet(sim.position, sim.nearest);
    advance(sim, 0.1);
    expect(
      toPlanet(sim.position, sim.nearest).distanceTo(atRelease),
    ).toBeLessThan(0.01);
  });
  it('waits for downlock, clears the ground before retracting, and restores gear from saved phase', () => {
    const { sim } = prepare();
    expect(sim.surface.gearDeployment).toBe(0);
    expect(sim.surface.land()).toBe(true);
    const before = toPlanet(sim.position, sim.nearest);
    advance(sim, 0.8);
    expect(sim.surface.gearDeployment).toBeCloseTo(0.5, 5);
    expect(toPlanet(sim.position, sim.nearest).distanceTo(before)).toBeLessThan(
      1e-7,
    );
    const paused = sim.surface.gearDeployment;
    sim.step(0, emptyControls());
    expect(sim.surface.gearDeployment).toBe(paused);
    advance(sim, 16);
    expect(sim.surface.phase).toBe('landed');
    expect(sim.surface.gearDeployment).toBe(1);
    const landed = sim.surface.record();
    sim.surface.exit();
    const walking = sim.surface.record();
    sim.surface.board();
    sim.surface.takeoff();
    advance(sim, 0.2);
    expect(sim.surface.gearDeployment).toBe(1);
    advance(sim, 0.8);
    expect(sim.surface.gearDeployment).toBeGreaterThan(0);
    expect(sim.surface.gearDeployment).toBeLessThan(1);
    const flying = sim.surface.record();
    advance(sim, 1.3);
    expect(sim.surface.phase).toBe('flight');
    expect(sim.surface.gearDeployment).toBe(0);
    for (const record of [landed, walking, flying]) {
      sim.surface.restore(record, true);
      expect(sim.surface.phase).toBe('restoring');
      expect(sim.surface.gearDeployment).toBe(
        record.phase === 'flight' ? 0 : 1,
      );
      advance(sim, 2);
      expect(sim.surface.gearDeployment).toBe(
        record.phase === 'flight' ? 0 : 1,
      );
    }
    sim.surface.reset();
    expect(sim.surface.gearDeployment).toBe(0);
  });
  it('rejects landing before terrain is ready and in unsafe flight conditions', () => {
    const s = new FlightSimulation();
    s.flightMessage = 'Ground clearance — engines stopped.';
    expect(s.surface.land()).toBe(false);
    expect(s.flightMessage).toBe('');
    s.descend();
    advance(s, 40);
    expect(s.surface.land()).toBe(false);
    expect(s.surface.message).toMatch(/Mapping/);
  });
  it('blocks boarding beyond boarding range and does not launch without the pilot', () => {
    const { sim } = prepare();
    sim.surface.land();
    advance(sim, 15);
    sim.surface.exit();
    const c = emptyControls();
    c.decelerate = true;
    advance(sim, 15, c);
    expect(sim.surface.shipDistance).toBeGreaterThan(0.055);
    expect(sim.surface.board()).toBe(false);
    expect(sim.surface.takeoff()).toBe(false);
    expect(sim.surface.phase).toBe('walking');
  });
  it('keeps landings and disembarking off water', () => {
    const sim = new FlightSimulation(),
      body = sim.target;
    let patch: ContactSurface | undefined;
    for (let i = 0; i < 40; i++) {
      const dir = new Vector3(
        Math.sin(i * 2),
        Math.cos(i * 0.7),
        Math.sin(i * 3 + 0.2),
      ).normalize();
      const candidate = new ContactSurface(generateContact(body, dir), body);
      if (candidate.sample(candidate.origin)?.water) {
        patch = candidate;
        break;
      }
    }
    expect(patch).toBeDefined();
    sim.position.copy(patch!.origin).addScaledVector(patch!.up, 10);
    sim.updateEnvironment();
    sim.surface.setPatch(patch!);
    expect(sim.surface.land()).toBe(false);
    expect(sim.surface.message).toMatch(/Water/);
  });
});
