import { beforeEach, describe, expect, it } from 'vitest';
import { Matrix4, Vector3 } from 'three';
import {
  ContactSurface,
  generateContact,
  EYE_HEIGHT,
} from '../lib/flight/contact';
import { createUniverse } from '../lib/flight/universe';
import {
  generateScenery,
  SCENERY_LIMIT,
  sceneryBlocks,
} from '../lib/flight/scenery';
import { FlightSimulation, emptyControls } from '../lib/flight/simulation';
import {
  captureExpedition,
  parseExpedition,
  restoreExpedition,
} from '../lib/flight/persistence';
const body = createUniverse()[0].planets[0];
const patch = new ContactSurface(
  generateContact(body, new Vector3(0, 0, 1)),
  body,
);
beforeEach(() => {
  body.rotationClock = { time: 0 };
  patch.syncRotation();
});
describe('persistent surface scenery', () => {
  it('places a bounded, repeatable field on dry rendered triangles', () => {
    const props = generateScenery(patch, patch.origin);
    expect(props.length).toBeGreaterThan(40);
    expect(props.length).toBeLessThanOrEqual(SCENERY_LIMIT);
    expect(generateScenery(patch, patch.origin)).toEqual(props);
    expect(new Set(props.map((p) => p.id)).size).toBe(props.length);
    for (const prop of props) {
      const ground = patch.sample(prop.point)!;
      expect(ground.water).toBe(false);
      expect(ground.point.distanceTo(prop.point)).toBeLessThan(1e-7);
      expect(ground.slope).toBeLessThanOrEqual(28);
    }
  });
  it('retains shared prop locations and dimensions when the observer moves', () => {
    const before = generateScenery(patch, patch.origin);
    const after = generateScenery(
      patch,
      patch.origin.clone().addScaledVector(patch.east, 0.16),
    );
    const shared = after.filter((p) => before.some((b) => b.id === p.id));
    expect(shared.length).toBeGreaterThan(30);
    for (const prop of shared)
      expect(prop).toEqual(before.find((b) => b.id === prop.id));
  });
  it('walks up to a rock without passing through its collision footprint', () => {
    const sim = new FlightSimulation();
    sim.position.copy(patch.origin).addScaledVector(patch.up, EYE_HEIGHT);
    sim.updateEnvironment();
    sim.surface.setPatch(patch);
    const point = patch.sample(
      sim.position.clone().addScaledVector(patch.east, 0.06),
    )!.point;
    sim.surface.scenery = [
      {
        id: 'test-rock',
        point,
        normal: patch.up.clone(),
        radius: 0.003,
        height: 0.003,
        yaw: 0,
        mineral: false,
      },
    ];
    sim.surface.phase = 'walking';
    sim.surface.shipPosition
      .copy(patch.origin)
      .addScaledVector(patch.east, -0.2);
    sim.position
      .copy(point)
      .addScaledVector(patch.east, 0.012)
      .addScaledVector(patch.up, EYE_HEIGHT);
    sim.orientation.setFromRotationMatrix(
      new Matrix4().lookAt(sim.position, point, patch.up),
    );
    const input = { ...emptyControls(), accelerate: true };
    for (let i = 0; i < 240; i++) sim.step(1 / 60, input);
    expect(
      sceneryBlocks(sim.surface.scenery, sim.position, patch.up, 0.00069),
    ).toBe(false);
    expect(sim.surface.message).toContain('Walk around');
    expect(sim.speed).toBe(0);
  });
  it('redirects a blocked landing to nearby ground with a clear footprint', () => {
    const sim = new FlightSimulation();
    const rock = generateScenery(patch, patch.origin)[0];
    sim.position.copy(rock.point).addScaledVector(patch.up, 10);
    sim.updateEnvironment();
    sim.surface.setPatch(patch);
    expect(sim.surface.land()).toBe(true);
    expect(sim.surface.message).toContain('nearby');
    for (let i = 0; i < 1200; i++) sim.step(1 / 60, emptyControls());
    expect(sim.surface.phase).toBe('landed');
    expect(
      sceneryBlocks(sim.surface.scenery, sim.position, patch.up, 0.035),
    ).toBe(false);
  });
  it('preserves legacy save clearings when saved and restored again', () => {
    const sim = new FlightSimulation();
    const rock = generateScenery(patch, patch.origin)[0];
    sim.position.copy(rock.point).addScaledVector(patch.up, EYE_HEIGHT);
    sim.updateEnvironment();
    sim.surface.phase = 'walking';
    sim.surface.bodyId = body.id;
    sim.surface.shipPosition
      .copy(patch.origin)
      .addScaledVector(patch.up, 0.003);
    const legacy = captureExpedition(sim)!;
    delete legacy.surface.sceneryVersion;
    delete legacy.surface.sceneryClearings;
    const restored = new FlightSimulation();
    expect(restoreExpedition(restored, legacy)).toBe(true);
    restored.surface.setPatch(patch);
    expect(restored.surface.scenery.some((p) => p.id === rock.id)).toBe(false);
    const saved = captureExpedition(restored)!;
    expect(saved.surface.sceneryVersion).toBe(1);
    expect(saved.surface.sceneryClearings).toHaveLength(2);
    const again = new FlightSimulation();
    expect(restoreExpedition(again, saved)).toBe(true);
    again.surface.setPatch(patch);
    expect(again.surface.scenery.some((p) => p.id === rock.id)).toBe(false);
    saved.surface.sceneryClearings![0].radius = 100;
    expect(parseExpedition(JSON.stringify(saved))).toBeNull();
  });
});
