import { describe, expect, it } from 'vitest';
import { coastDirection, COAST_UP } from '../lib/flight/coast';
import { planetRotation } from '../lib/flight/rotation';
import { elevation } from '../lib/flight/universe';
import { FlightSimulation, emptyControls } from '../lib/flight/simulation';
import { ContactSurface, generateContact } from '../lib/flight/contact';
import {
  captureExpedition,
  parseExpedition,
  restoreExpedition,
} from '../lib/flight/persistence';
import { terrainColor } from '../lib/flight/terrain';
import { sampleBiome } from '../lib/flight/biomes';
import { terrainSignature } from '../lib/flight/terrain-cache';

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
    expect(center.water).toBe(false);
    expect(center.slope).toBeLessThan(1);
    expect(elevation(coastDirection(0, 0.5), body)).toBeLessThan(0);
    expect(elevation(coastDirection(1.7, 1.8), body)).toBeGreaterThan(0.45);
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
      parseExpedition(JSON.stringify({ ...migrated, terrainVersion: 3 })),
    ).toBeNull();
    restored.startCoast();
    expect(restored.terrainVersion).toBe(2);
    expect(elevation(COAST_UP, restored.nearest)).toBeCloseTo(0.062, 8);
  });
  it('separates both terrain profiles in persistent and in-memory planet cache signatures', () => {
    const body = new FlightSimulation().target;
    const options = { pixels: 2, projection: 800, maxLeaves: 3000 };
    expect(
      terrainSignature({ ...body, terrainVersion: 1 }, 'high', options),
    ).not.toBe(
      terrainSignature({ ...body, terrainVersion: 2 }, 'high', options),
    );
  });
});
