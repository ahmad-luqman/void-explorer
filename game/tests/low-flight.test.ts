import { describe, expect, it } from 'vitest';
import { Matrix4, Vector3 } from 'three';
import { ContactSurface, generateContact } from '../lib/flight/contact';
import { FLIGHT_RADIUS, flightClearance } from '../lib/flight/flight-clearance';
import { FlightSimulation, emptyControls } from '../lib/flight/simulation';
import { createUniverse, elevation } from '../lib/flight/universe';
const body = createUniverse()[0].planets[0];
const patch = new ContactSurface(
  generateContact(body, new Vector3(0, 0, 1)),
  body,
);
function setup(height = 0.3) {
  const sim = new FlightSimulation();
  sim.position.copy(patch.origin).addScaledVector(patch.up, height);
  sim.updateEnvironment();
  sim.surface.setPatch(patch);
  sim.orientation.setFromRotationMatrix(
    new Matrix4().lookAt(sim.position, patch.origin, patch.north),
  );
  return sim;
}
describe('manual surface flight', () => {
  it('descends using throttle to whole-ship clearance, then climbs away without teleporting', () => {
    const sim = setup();
    const input = { ...emptyControls(), accelerate: true };
    let largestStep = 0;
    for (let i = 0; i < 1200; i++) {
      const before = sim.position.clone();
      sim.step(1 / 60, input);
      largestStep = Math.max(largestStep, sim.position.distanceTo(before));
    }
    expect(sim.surface.phase).toBe('flight');
    expect(sim.altitude).toBeLessThan(0.05);
    expect(sim.groundClearance).toBeGreaterThanOrEqual(-1e-8);
    expect(sim.flightMessage).toContain('clearance');
    expect(largestStep).toBeLessThan(0.004);
    sim.face(sim.position.clone().add(patch.up));
    for (let i = 0; i < 300; i++) sim.step(1 / 60, input);
    expect(sim.altitude).toBeGreaterThan(0.04);
    expect(sim.flightMessage).toBe('');
  });
  it('stops residual pulse travel at terrain instead of continuing later substeps', () => {
    const sim = setup(1);
    sim.speed = 24000;
    sim.throttle = 1;
    sim.pulse = true;
    sim.descending = true;
    sim.step(0.05, emptyControls());
    expect(sim.altitude).toBeGreaterThan(FLIGHT_RADIUS);
    expect(sim.altitude).toBeLessThan(0.05);
    expect(sim.speed).toBe(0);
    expect(sim.autopilot).toBe(false);
    expect(sim.descending).toBe(false);
    expect(sim.pulse).toBe(false);
  });
  it('protects banked wings and slopes using the rendered footprint', () => {
    const sim = setup(0.03);
    sim.orientation.setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);
    const before = flightClearance(sim.position, body, patch, []);
    expect(before.distance).toBeGreaterThan(0);
    for (const offset of [-0.018, 0, 0.018]) {
      const at = sim.position.clone().addScaledVector(patch.east, offset);
      const ground = patch.sample(at)!;
      expect(at.sub(ground.point).dot(ground.normal)).toBeGreaterThan(
        FLIGHT_RADIUS,
      );
    }
    sim.position.addScaledVector(patch.up, -0.02);
    expect(
      flightClearance(sim.position, body, patch, []).distance,
    ).toBeLessThan(0);
  });
  it('holds before leaving the dense patch, then resumes after replacement arrives', () => {
    const sim = setup(0.08);
    sim.position.addScaledVector(patch.east, 1.14);
    const ground = patch.sample(sim.position)!;
    sim.position.copy(ground.point).addScaledVector(patch.up, 0.08);
    sim.face(sim.position.clone().add(patch.east));
    sim.speed = 1;
    sim.step(0.05, emptyControls());
    expect(patch.coordinates(sim.position).x).toBeLessThan(1.16);
    expect(sim.flightMessage).toContain('mapped');
    const held = sim.position.clone();
    sim.step(0.05, { ...emptyControls(), accelerate: true });
    expect(sim.position.distanceTo(held)).toBeLessThan(1e-6);
    sim.surface.setPatch(
      new ContactSurface(
        generateContact(body, sim.position.clone().sub(body.position)),
        body,
      ),
    );
    for (let i = 0; i < 120; i++)
      sim.step(1 / 60, { ...emptyControls(), accelerate: true });
    expect(sim.position.distanceTo(held)).toBeGreaterThan(0.005);
    expect(sim.flightMessage).toBe('');
  });
  it('checks the height of tilted rocks, allowing flight above them', () => {
    const prop = {
      id: 'spire',
      point: patch.origin,
      normal: patch.up.clone().addScaledVector(patch.east, 0.3).normalize(),
      radius: 0.003,
      height: 0.025,
      yaw: 0,
      mineral: true,
    };
    const low = patch.origin.clone().addScaledVector(patch.up, 0.04);
    expect(flightClearance(low, body, patch, []).distance).toBeGreaterThan(0);
    expect(flightClearance(low, body, patch, [prop]).distance).toBeLessThan(0);
    expect(
      flightClearance(
        low.clone().addScaledVector(patch.up, 0.08),
        body,
        patch,
        [prop],
      ).distance,
    ).toBeGreaterThan(0);
  });
  it('stops a fast approach to a narrow rock and can fly above it', () => {
    const sim = setup(0.04);
    sim.position.addScaledVector(patch.east, -0.1);
    sim.surface.scenery = [
      {
        id: 'spire',
        point: patch.origin,
        normal: patch.up,
        radius: 0.003,
        height: 0.025,
        yaw: 0,
        mineral: true,
      },
    ];
    sim.face(sim.position.clone().add(patch.east));
    sim.speed = 10;
    sim.step(0.05, emptyControls());
    expect(sim.flightMessage).toContain('Obstacle');
    expect(sim.speed).toBe(0);
    expect(patch.coordinates(sim.position).x).toBeLessThan(-0.02);
  });
  it('protects sea level and rejects missing or unrelated terrain data', () => {
    const ocean = new Vector3();
    for (let i = 1; i < 100; i++) {
      ocean.set(Math.sin(i), Math.cos(i * 2), Math.sin(i * 3)).normalize();
      if (elevation(ocean, body) < -1) break;
    }
    const water = new ContactSurface(generateContact(body, ocean), body);
    expect(water.sample(water.origin)!.water).toBe(true);
    const low = water.origin.clone().addScaledVector(water.up, 0.01);
    expect(flightClearance(low, body, water, []).distance).toBeLessThan(0);
    const near = patch.origin.clone().addScaledVector(patch.up, 0.1);
    expect(flightClearance(near, body, null, []).distance).toBeLessThan(0);
    expect(
      flightClearance(
        near,
        body,
        new ContactSurface(patch.data, createUniverse()[1].planets[0]),
        [],
      ).distance,
    ).toBeLessThan(0);
  });
});
