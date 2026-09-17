import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { ContactSurface, generateContact } from '../lib/flight/contact';
import { FlightSimulation } from '../lib/flight/simulation';
import { EXPEDITION_SITES } from '../lib/flight/sites';
import { fromPlanet, toPlanet, planetRotation } from '../lib/flight/rotation';
import * as scenery from '../lib/flight/scenery';
import {
  prepareScenery,
  restorePreparedScenery,
} from '../lib/flight/scenery-preparation';
import {
  captureExpedition,
  restoreExpedition,
} from '../lib/flight/persistence';

function setup(siteId = 'lumen-coast', version: 1 | 2 | 3 | 4 | 5 = 5) {
  const sim = new FlightSimulation();
  sim.startSite(siteId);
  sim.setTerrainVersion(version);
  const body = sim.target;
  const site = EXPEDITION_SITES.find((s) => s.id === siteId)!;
  const data = generateContact(
    body,
    site.up.clone().applyQuaternion(planetRotation(body)),
  );
  const prepared = prepareScenery(data, body, toPlanet(sim.position, body));
  return { sim, body, data, prepared };
}
function sameField(
  actual: ReturnType<typeof scenery.generateScenery>,
  expected: ReturnType<typeof scenery.generateScenery>,
) {
  expect(actual.map((p) => p.id)).toEqual(expected.map((p) => p.id));
  for (let i = 0; i < actual.length; i++) {
    const { point, normal, ...shape } = actual[i];
    const { point: ep, normal: en, ...expectedShape } = expected[i];
    expect(shape).toEqual(expectedShape);
    expect(point.distanceTo(ep)).toBeLessThan(1e-7);
    expect(normal.distanceTo(en)).toBeLessThan(1e-7);
  }
}
describe('worker-prepared scenery', () => {
  it('preserves all saved coast profiles and both authored destination fields after rotation', () => {
    for (const [site, version] of [
      ...([1, 2, 3, 4, 5] as const).map((v) => ['lumen-coast', v] as const),
      ['ember-relay', 5] as const,
      ['glass-choir', 5] as const,
    ]) {
      const { sim, body, data, prepared } = setup(site, version);
      // The reply was captured before the shared planet clock advanced.
      sim.rotationClock.time += 317;
      const focus = fromPlanet(new Vector3().fromArray(prepared.focus), body);
      const patch = new ContactSurface(data, body);
      const restored = restorePreparedScenery(structuredClone(prepared), body);
      expect(restored.length).toBeGreaterThan(0);
      expect(restored.length).toBeLessThanOrEqual(scenery.SCENERY_LIMIT);
      sameField(restored, scenery.generateScenery(patch, focus));
      expect(
        toPlanet(focus, body).distanceTo(
          new Vector3().fromArray(prepared.focus),
        ),
      ).toBeLessThan(1e-8);
    }
  }, 20000);
  it('avoids synchronous generation for fresh replies and landing, but rejects stale or foreign fields', () => {
    const { sim, body, data, prepared } = setup();
    const spy = vi.spyOn(scenery, 'generateScenery');
    try {
      sim.surface.setPatch(new ContactSurface(data, body), prepared);
      expect(sim.surface.scenery.length).toBeGreaterThan(0);
      expect(spy).not.toHaveBeenCalled();
      expect(sim.surface.land()).toBe(true);
      expect(spy).not.toHaveBeenCalled();
      sim.surface.phase = 'flight';
      sim.surface.setPatch(new ContactSurface(data, body), {
        ...prepared,
        focus: [0, 0, 0],
        props: [],
      });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(sim.surface.scenery.length).toBeGreaterThan(0);
      sim.surface.setPatch(new ContactSurface(data, body), {
        ...prepared,
        bodyId: 'another-planet',
        props: [],
      });
      expect(spy).toHaveBeenCalledTimes(2);
      expect(sim.surface.scenery.length).toBeGreaterThan(0);
    } finally {
      spy.mockRestore();
    }
  });
  it('applies saved legacy clearings before restoring walking', () => {
    const { sim, body, data } = setup();
    sim.surface.setPatch(new ContactSurface(data, body));
    const rock = sim.surface.scenery.find((p) => p.shape !== 'landmark')!;
    sim.position
      .copy(rock.point)
      .addScaledVector(sim.surface.patch!.up, 0.0018);
    sim.surface.phase = 'walking';
    sim.surface.bodyId = body.id;
    sim.surface.shipPosition.copy(sim.position);
    const saved = captureExpedition(sim)!;
    delete saved.surface.sceneryVersion;
    delete saved.surface.sceneryClearings;
    const reference = new FlightSimulation(),
      restored = new FlightSimulation();
    expect(restoreExpedition(reference, saved)).toBe(true);
    expect(restoreExpedition(restored, saved)).toBe(true);
    const snapshot = prepareScenery(data, body, toPlanet(sim.position, body));
    reference.surface.setPatch(new ContactSurface(data, reference.nearest));
    restored.surface.setPatch(
      new ContactSurface(data, restored.nearest),
      snapshot,
    );
    expect(restored.surface.phase).toBe('walking');
    expect(restored.surface.scenery.some((p) => p.id === rock.id)).toBe(false);
    sameField(restored.surface.scenery, reference.surface.scenery);
    expect(restored.position.distanceTo(reference.position)).toBeLessThan(1e-7);
  });
});
