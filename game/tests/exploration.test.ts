import { describe, expect, it } from 'vitest';
import { Matrix4, Vector3 } from 'three';
import { sampleBiome } from '../lib/flight/biomes';
import { createUniverse, elevation } from '../lib/flight/universe';
import {
  ContactSurface,
  generateContact,
  EYE_HEIGHT,
} from '../lib/flight/contact';
import {
  generateScenery,
  sceneryBlocks,
  sceneryApproachBlocked,
} from '../lib/flight/scenery';
import { explorationGeometry } from '../lib/flight/scenery-geometry';
import { FlightSimulation, emptyControls } from '../lib/flight/simulation';
import {
  captureExpedition,
  restoreExpedition,
  parseExpedition,
} from '../lib/flight/persistence';
import { flightClearance } from '../lib/flight/flight-clearance';
const coast = new Vector3(
  0.4578271005130527,
  0.8452666666666666,
  0.2755333160582099,
);
const advance = (sim: FlightSimulation, seconds: number) => {
  for (let i = 0; i < seconds * 20; i++) sim.step(0.05, emptyControls());
};
describe('richer surface exploration', () => {
  it('has repeatable distinct native biomes on each world type, with no plants on ice or water', () => {
    const worlds = createUniverse();
    for (const body of worlds[0].planets) {
      const ids = new Set<string>();
      for (let i = 0; i < 500; i++) {
        const d = new Vector3(
          Math.cos(i * 2.4),
          i / 250 - 1,
          Math.sin(i * 2.4),
        ).normalize();
        const biome = sampleBiome(d, body);
        expect(sampleBiome(d, body)).toEqual(biome);
        ids.add(biome.id);
        if (
          body.kind === 'ice' ||
          (body.kind === 'ocean' && elevation(d, body) <= 0)
        )
          expect(biome.vegetation).toBeNull();
      }
      expect(ids.size).toBeGreaterThanOrEqual(3);
    }
  });
  it('encloses every plant and landmark vertex in the shared collision envelope with a small geometry budget', () => {
    for (const shape of ['fan', 'succulent', 'landmark'] as const) {
      const geometry = explorationGeometry(shape),
        position = geometry.getAttribute('position');
      expect(position.count / 3).toBeLessThan(200);
      for (let i = 0; i < position.count; i++) {
        expect(
          Math.hypot(position.getX(i), position.getZ(i)),
        ).toBeLessThanOrEqual(1.000001);
        expect(position.getY(i)).toBeGreaterThanOrEqual(-1e-7);
        expect(position.getY(i)).toBeLessThanOrEqual(1.000001);
      }
      geometry.dispose();
    }
  });
  it('lands and walks on a vegetated coast, preserves the nearest landmark through reload, and takes off', () => {
    const sim = new FlightSimulation(),
      body = sim.target;
    const patch = new ContactSurface(generateContact(body, coast), body);
    sim.position.copy(patch.origin).addScaledVector(patch.up, 10);
    sim.updateEnvironment();
    sim.surface.setPatch(patch);
    expect(sim.surface.scenery.some((p) => p.shape === 'fan')).toBe(true);
    expect(sim.surface.land()).toBe(true);
    advance(sim, 15);
    expect(sim.surface.phase).toBe('landed');
    expect(
      sceneryBlocks(sim.surface.scenery, sim.position, patch.up, 0.035),
    ).toBe(false);
    expect(sim.surface.exit()).toBe(true);
    expect(sim.surface.survey.biome).toBe('Tidal terraces');
    const landmark = sim.surface.survey.landmark!;
    expect(landmark.name).toBe('Tide Sentinels');
    sim.surface.lookAtLandmark();
    const forward = new Vector3(0, 0, -1).applyQuaternion(sim.orientation);
    const prop = sim.surface.scenery.find((p) => p.id === landmark.id)!;
    expect(
      forward.dot(prop.point.clone().sub(sim.position).normalize()),
    ).toBeGreaterThan(0.9);
    const restored = new FlightSimulation(),
      save = captureExpedition(sim)!;
    expect(restoreExpedition(restored, save)).toBe(true);
    restored.surface.setPatch(
      new ContactSurface(
        generateContact(
          restored.nearest,
          restored.position.clone().sub(restored.nearest.position),
        ),
        restored.nearest,
      ),
    );
    expect(restored.surface.survey.landmark?.id).toBe(landmark.id);
    expect(restored.surface.board()).toBe(true);
    expect(restored.surface.takeoff()).toBe(true);
    advance(restored, 3);
    expect(restored.surface.phase).toBe('flight');
  });
  it('migrates old scenery saves with clear space around new plants and landmarks, then retains the exclusions', () => {
    const sim = new FlightSimulation(),
      body = sim.target;
    const patch = new ContactSurface(generateContact(body, coast), body),
      props = generateScenery(patch, patch.origin);
    const plant = props.find((p) => p.shape === 'fan')!,
      landmark = props.find((p) => p.landmark)!;
    sim.position.copy(plant.point).addScaledVector(patch.up, EYE_HEIGHT);
    sim.updateEnvironment();
    sim.surface.phase = 'walking';
    sim.surface.bodyId = body.id;
    sim.surface.shipPosition
      .copy(landmark.point)
      .addScaledVector(patch.up, 0.003);
    const old = captureExpedition(sim)!;
    old.surface.sceneryVersion = 1;
    const restored = new FlightSimulation();
    expect(restoreExpedition(restored, old)).toBe(true);
    restored.surface.setPatch(patch);
    expect(
      restored.surface.scenery.some(
        (p) => p.id === plant.id || p.id === landmark.id,
      ),
    ).toBe(false);
    const saved = captureExpedition(restored)!;
    expect(saved.surface.sceneryVersion).toBe(2);
    expect(parseExpedition(JSON.stringify(saved))).not.toBeNull();
    const again = new FlightSimulation();
    expect(restoreExpedition(again, saved)).toBe(true);
    again.surface.setPatch(patch);
    expect(
      again.surface.scenery.some(
        (p) => p.id === plant.id || p.id === landmark.id,
      ),
    ).toBe(false);
  });
  it('blocks a plant on foot and in low flight, while allowing overflight and a clear final approach', () => {
    const sim = new FlightSimulation(),
      body = sim.target,
      patch = new ContactSurface(generateContact(body, coast), body);
    const prop = generateScenery(patch, patch.origin).find(
      (p) => p.shape === 'fan',
    )!;
    sim.position
      .copy(prop.point)
      .addScaledVector(patch.east, prop.radius + 0.002)
      .addScaledVector(patch.up, EYE_HEIGHT);
    sim.updateEnvironment();
    sim.surface.setPatch(patch);
    sim.surface.scenery = [prop];
    sim.surface.phase = 'walking';
    sim.surface.shipPosition.copy(patch.origin).addScaledVector(patch.east, -1);
    sim.orientation.setFromRotationMatrix(
      new Matrix4().lookAt(sim.position, prop.point, patch.up),
    );
    for (let i = 0; i < 40; i++)
      sim.step(0.05, { ...emptyControls(), accelerate: true });
    expect(sceneryBlocks([prop], sim.position, patch.up, 0.00069)).toBe(false);
    expect(sim.surface.message).toContain('Walk around');
    const above = prop.point.clone().addScaledVector(prop.normal, 0.03);
    expect(flightClearance(above, body, patch, [prop]).distance).toBeLessThan(
      flightClearance(above, body, patch, []).distance,
    );
    expect(
      flightClearance(
        prop.point.clone().addScaledVector(prop.normal, 0.15),
        body,
        patch,
        [prop],
      ).distance,
    ).toBeGreaterThan(0);
    const from = prop.point
      .clone()
      .addScaledVector(patch.east, -0.1)
      .addScaledVector(prop.normal, prop.height / 2);
    const to = prop.point
      .clone()
      .addScaledVector(patch.east, 0.1)
      .addScaledVector(prop.normal, prop.height / 2);
    expect(sceneryApproachBlocked([prop], from, to)).toBe(true);
    expect(
      sceneryApproachBlocked(
        [prop],
        from.clone().addScaledVector(patch.up, 0.1),
        to.clone().addScaledVector(patch.up, 0.1),
      ),
    ).toBe(false);
  });
});
