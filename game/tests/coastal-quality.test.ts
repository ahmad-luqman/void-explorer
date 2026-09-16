import { describe, expect, it } from 'vitest';
import {
  coastDirection,
  coastalElevation,
  COAST_UP,
} from '../lib/flight/coast';
import { validContact } from '../lib/flight/terrain-validation';
import { planetRotation } from '../lib/flight/rotation';
import { elevation } from '../lib/flight/universe';
import { FlightSimulation, emptyControls } from '../lib/flight/simulation';
import {
  ContactSurface,
  generateContact,
  contactAxis,
} from '../lib/flight/contact';
import {
  captureExpedition,
  parseExpedition,
  restoreExpedition,
} from '../lib/flight/persistence';
import { terrainColor } from '../lib/flight/terrain';
import { sampleBiome } from '../lib/flight/biomes';
import { terrainSignature } from '../lib/flight/terrain-cache';
import {
  generateScenery,
  sceneryBlocks,
  SCENERY_LIMIT,
} from '../lib/flight/scenery';
import { fromPlanet } from '../lib/flight/rotation';
import { surfaceRadius } from '../lib/flight/universe';

describe('playable coastal visual slice', () => {
  it('has a safe landing shelf, connected coves, offshore relief and distant ridges in the collision heightfield', () => {
    const sim = new FlightSimulation();
    sim.startCoast();
    const body = sim.target,
      patch = new ContactSurface(
        generateContact(
          body,
          COAST_UP.clone().applyQuaternion(planetRotation(body)),
        ),
        body,
      );
    const center = patch.sample(patch.origin)!;
    expect(validContact(patch.data)).toBe(true);
    expect(patch.data.positions.length / 3).toBeLessThan(100000);
    expect(patch.data.indices.length / 3).toBeLessThan(200000);
    const near = [...patch.data.axis].filter((x) => x >= 0 && x <= 3);
    expect(
      Math.max(...near.slice(1).map((x, i) => x - near[i])),
    ).toBeLessThanOrEqual(0.07500001);
    expect(center.water).toBe(false);
    expect(center.slope).toBeLessThan(1);
    expect(elevation(coastDirection(0, 0.5), body)).toBeLessThan(0);
    expect(elevation(coastDirection(-0.87, 1.24), body)).toBeGreaterThan(0.2);
    expect(elevation(coastDirection(1, -4.8), body)).toBeGreaterThan(2);
    const sea = coastDirection(0, 0.5)
      .multiplyScalar(body.radius)
      .applyQuaternion(planetRotation(body));
    expect(patch.sample(sea)?.water).toBe(true);
    sim.surface.setPatch(patch);
    expect(sim.surface.land()).toBe(true);
    for (let i = 0; i < 300; i++) sim.step(0.05, emptyControls());
    expect(sim.surface.exit()).toBe(true);
    expect(sim.surface.survey.coast).toBe(true);
    const at = sim.position.clone();
    sim.surface.lookOverBay();
    expect(sim.position.distanceTo(at)).toBe(0);
  });
  it('refines distant cliff coverage within the contact budget and retains profile-4 saves', () => {
    const axis = [...contactAxis(true, true, true)];
    expect(axis.length ** 2).toBeLessThan(100000);
    const ridge = axis.filter((x) => x >= 3 && x <= 18);
    expect(
      Math.max(...ridge.slice(1).map((x, i) => x - ridge[i])),
    ).toBeLessThanOrEqual(0.400000001);
    expect(axis.filter((x) => Math.abs(x) <= 0.3)).toEqual(
      [...contactAxis(true, true)].filter((x) => Math.abs(x) <= 0.3),
    );
    const sim = new FlightSimulation();
    sim.startCoast();
    sim.setTerrainVersion(4);
    const saved = captureExpedition(sim)!;
    const samples = [
      [0, 0],
      [0.02, 0.02],
      [-0.67, 1.24],
      [1.9, -4.8],
      [4.2, 11.5],
      [-3.1, 15.4],
    ].map(([x, z]) => coastDirection(x, z));
    const old = samples.map((d) => elevation(d, sim.target));
    const restored = new FlightSimulation();
    expect(restoreExpedition(restored, saved)).toBe(true);
    expect(restored.terrainVersion).toBe(4);
    expect(samples.map((d) => elevation(d, restored.target))).toEqual(old);
    sim.setTerrainVersion(5);
    expect(samples.slice(0, 2).map((d) => elevation(d, sim.target))).toEqual(
      old.slice(0, 2),
    );
    expect(
      samples
        .slice(2)
        .some(
          (d, i) => Math.abs(elevation(d, sim.target) - old[i + 2]) > 0.005,
        ),
    ).toBe(true);
  });
  it('colors dry coastal shelves violet rather than using the shallow-water palette', () => {
    const sim = new FlightSimulation(),
      body = sim.target;
    const color = terrainColor(
      0.062 / body.radius,
      'ocean',
      1,
      sampleBiome(COAST_UP, body),
    );
    expect(color.r).toBeGreaterThan(color.g);
    const water = terrainColor(-0.00001, 'ocean');
    expect(water.g).toBeGreaterThan(water.r);
    expect(color.b).toBeGreaterThan(0);
  });
  it('keeps old landed geography when migrating version-4 saves, and retains that profile in subsequent saves', () => {
    const source = new FlightSimulation();
    source.setTerrainVersion(1);
    const body = source.target,
      patch = new ContactSurface(generateContact(body, COAST_UP), body);
    source.position.copy(patch.origin).addScaledVector(patch.up, 0.003);
    source.updateEnvironment();
    source.surface.phase = 'landed';
    source.surface.bodyId = body.id;
    source.surface.shipPosition.copy(source.position);
    source.surface.shipOrientation.copy(source.orientation);
    const old = captureExpedition(source)!;
    old.version = 4;
    delete old.terrainVersion;
    const restored = new FlightSimulation();
    expect(restoreExpedition(restored, old)).toBe(true);
    expect(restored.terrainVersion).toBe(1);
    expect(elevation(COAST_UP, restored.nearest)).toBeCloseTo(
      elevation(COAST_UP, body),
      9,
    );
    restored.surface.setPatch(
      new ContactSurface(
        generateContact(restored.nearest, COAST_UP),
        restored.nearest,
      ),
    );
    const migrated = captureExpedition(restored)!;
    expect(migrated.version).toBe(5);
    expect(migrated.terrainVersion).toBe(1);
    expect(
      parseExpedition(JSON.stringify({ ...migrated, terrainVersion: 6 })),
    ).toBeNull();
    restored.startCoast();
    expect(restored.terrainVersion).toBe(5);
    expect(elevation(COAST_UP, restored.nearest)).toBeCloseTo(0.062, 8);
  });
  it('retains profile-2 saved coast geometry while new expeditions gain distinct ridges', () => {
    const source = new FlightSimulation();
    source.startCoast();
    source.setTerrainVersion(2);
    source.surface.setPatch(
      new ContactSurface(
        generateContact(
          source.target,
          COAST_UP.clone().applyQuaternion(planetRotation(source.target)),
        ),
        source.target,
      ),
    );
    expect(source.surface.land()).toBe(true);
    for (let i = 0; i < 300; i++) source.step(0.05, emptyControls());
    expect(source.surface.exit()).toBe(true);
    const saved = captureExpedition(source)!;
    const restored = new FlightSimulation();
    expect(restoreExpedition(restored, saved)).toBe(true);
    expect(restored.terrainVersion).toBe(2);
    restored.surface.setPatch(
      new ContactSurface(
        generateContact(
          restored.target,
          restored.position.clone().sub(restored.target.position),
        ),
        restored.target,
      ),
    );
    const original = { ...source.target, terrainVersion: 1 as const };
    const refined = { ...source.target, terrainVersion: 3 as const };
    let changed = 0;
    for (const [x, z] of [
      [0, 0],
      [0.02, 0.02],
      [1.5, 1.8],
      [-0.8, 1],
      [1, -4.8],
      [20, 10],
    ]) {
      const d = coastDirection(x, z);
      const legacy = coastalElevation(
        d,
        original.radius,
        elevation(d, original),
      );
      expect(elevation(d, restored.target)).toBe(legacy);
      if (Math.abs(elevation(d, refined) - legacy) > 0.001) changed++;
    }
    expect(changed).toBeGreaterThanOrEqual(3);
    expect(elevation(COAST_UP, refined)).toBe(
      elevation(COAST_UP, restored.target),
    );
    expect(captureExpedition(restored)!.terrainVersion).toBe(2);
    expect(restored.surface.phase).toBe('walking');
    const resaved = captureExpedition(restored)!;
    resaved.position.forEach((n, i) =>
      expect(Math.abs(n - saved.position[i])).toBeLessThan(1e-6),
    );
    resaved.surface.shipPosition.forEach((n, i) =>
      expect(n).toBeCloseTo(saved.surface.shipPosition[i], 8),
    );
  });
  it('separates every terrain profile in persistent and in-memory planet cache signatures', () => {
    const body = new FlightSimulation().target;
    const options = { pixels: 2, projection: 800, maxLeaves: 3000 };
    expect(
      new Set(
        ([1, 2, 3, 4, 5] as const).map((terrainVersion) =>
          terrainSignature({ ...body, terrainVersion }, 'high', options),
        ),
      ).size,
    ).toBe(5);
  });
  it('opens a water corridor, preserves the old landing shelf and keeps profile-3 heights through reload', () => {
    const source = new FlightSimulation();
    source.startCoast();
    const latest = { ...source.target };
    source.setTerrainVersion(3);
    const original = { ...source.target, terrainVersion: 1 as const };
    const saved = captureExpedition(source)!;
    const restored = new FlightSimulation();
    expect(restoreExpedition(restored, saved)).toBe(true);
    expect(restored.terrainVersion).toBe(3);
    for (const [x, z] of [
      [0, 0],
      [0.02, 0.02],
      [0.07, 0.05],
      [0.45, 0.65],
      [1.7, 1.8],
      [1, -4.8],
    ]) {
      const d = coastDirection(x, z);
      expect(elevation(d, restored.target)).toBe(
        coastalElevation(d, original.radius, elevation(d, original), true),
      );
      if (Math.hypot(x, z) < 0.039)
        expect(elevation(d, latest)).toBe(elevation(d, restored.target));
    }
    for (const z of [0.4, 0.7, 1, 2, 3]) {
      expect(elevation(coastDirection(z * 0.35, z), latest)).toBeLessThan(0);
    }
  });
  it('composes close scenery within budget while leaving both walking lanes and the ship footprint clear', () => {
    const sim = new FlightSimulation();
    sim.startCoast();
    const body = sim.target;
    const patch = new ContactSurface(
      generateContact(
        body,
        COAST_UP.clone().applyQuaternion(planetRotation(body)),
      ),
      body,
    );
    const props = generateScenery(patch, patch.origin);
    expect(props.length).toBeLessThanOrEqual(SCENERY_LIMIT);
    expect(
      props.filter((p) => p.point.distanceTo(patch.origin) < 0.15).length,
    ).toBeGreaterThan(50);
    expect(props.some((p) => p.id.endsWith('vista:sentinels'))).toBe(true);
    expect(sceneryBlocks(props, patch.origin, patch.up, 0.035)).toBe(false);
    for (const side of [-1, 1])
      for (let z = 0; z <= 0.075; z += 0.005) {
        const d = coastDirection(side * 0.027 + z * 0.65, z, body.radius);
        const point = fromPlanet(
          d.clone().multiplyScalar(surfaceRadius(d, body)),
          body,
        );
        expect(sceneryBlocks(props, point, patch.up, 0.0007)).toBe(false);
      }
    expect(generateScenery(patch, patch.origin).map((p) => p.id)).toEqual(
      props.map((p) => p.id),
    );
  });
});
