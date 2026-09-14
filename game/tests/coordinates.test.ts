import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  address,
  translate,
  difference,
  validAddress,
  CELL_SIZE,
} from '../lib/flight/coordinates';
import { createUniverse } from '../lib/flight/universe';
import { FlightSimulation, emptyControls } from '../lib/flight/simulation';
import { ContactSurface, generateContact } from '../lib/flight/contact';
import {
  captureExpedition,
  restoreExpedition,
  parseExpedition,
} from '../lib/flight/persistence';
import { toPlanet } from '../lib/flight/rotation';
const advance = (sim: FlightSimulation, seconds: number) => {
  for (let i = 0; i < seconds * 20; i++) sim.step(0.05, emptyControls());
};
describe('cell-based space addresses', () => {
  it('retains millimeter displacements at huge addresses and across positive/negative cell boundaries', () => {
    for (const sign of [-1, 1]) {
      const start = address(
        [sign * 100_000_000, -sign * 200_000_000, 0],
        new Vector3(sign * (CELL_SIZE / 2 - 0.000001), 12.25, -91),
      );
      const next = translate(
        start,
        new Vector3(sign * 0.000004, 0.000001, -0.000003),
      );
      expect(validAddress(next)).toBe(true);
      expect(
        difference(next, start).distanceTo(
          new Vector3(sign * 0.000004, 0.000001, -0.000003),
        ),
      ).toBeLessThan(1e-9);
      expect(next.cells[0]).not.toBe(start.cells[0]);
    }
    expect(validAddress({ cells: [Infinity, 0, 0], offset: [0, 0, 0] })).toBe(
      false,
    );
    expect(validAddress({ cells: [0, 0, 0], offset: [CELL_SIZE, 0, 0] })).toBe(
      false,
    );
  });
  it('widens system separation while preserving every local planet offset', () => {
    const old = createUniverse(1),
      worlds = createUniverse();
    expect(
      difference(worlds[500].address!, worlds[0].address!).length(),
    ).toBeGreaterThan(1e12);
    for (const id of [0, 1, 500, 1023])
      for (let p = 0; p < 3; p++) {
        expect(
          difference(
            worlds[id].planets[p].address!,
            worlds[id].address!,
          ).distanceTo(
            old[id].planets[p].position.clone().sub(old[id].position),
          ),
        ).toBeLessThan(1e-8);
      }
  });
  it('lands, walks, reloads and takes off at a remote address without losing surface precision', () => {
    const sim = new FlightSimulation(),
      body = sim.systems[500].planets[1];
    sim.setAddress(
      translate(body.address!, new Vector3(0, 0, body.radius + 20)),
    );
    sim.updateEnvironment();
    const patch = new ContactSurface(
      generateContact(body, new Vector3(0, 0, 1)),
      body,
    );
    sim.position.copy(patch.origin).addScaledVector(patch.up, 10);
    sim.updateEnvironment();
    sim.surface.setPatch(patch);
    expect(sim.nearest.id).toBe(body.id);
    expect(sim.surface.land()).toBe(true);
    advance(sim, 15);
    expect(sim.surface.exit()).toBe(true);
    const before = toPlanet(sim.surface.shipPosition, body);
    const walk = { ...emptyControls(), decelerate: true };
    for (let i = 0; i < 40; i++) sim.step(0.05, walk);
    expect(sim.surface.walked).toBeGreaterThan(0.004);
    const save = captureExpedition(sim)!;
    const restored = new FlightSimulation();
    const inconsistent = structuredClone(save);
    inconsistent.address!.offset[0] += 1;
    const untouched = restored.snapshot();
    expect(restoreExpedition(restored, inconsistent)).toBe(false);
    expect(restored.snapshot()).toEqual(untouched);
    expect(restoreExpedition(restored, save)).toBe(true);
    const target = restored.nearest;
    restored.surface.setPatch(
      new ContactSurface(
        generateContact(target, restored.position.clone().sub(target.position)),
        target,
      ),
    );
    advance(restored, 20);
    expect(
      toPlanet(restored.surface.shipPosition, target).distanceTo(before),
    ).toBeLessThan(1e-7);
    expect(restored.surface.board()).toBe(true);
    expect(restored.surface.takeoff()).toBe(true);
    advance(restored, 3);
    expect(restored.surface.phase).toBe('flight');
    expect(restored.altitude).toBeGreaterThan(0.11);
  });
  it('migrates old remote flight and surface saves into their widened system, rejecting malformed cells atomically', () => {
    const old = createUniverse(1),
      source = new FlightSimulation();
    const save = captureExpedition(source)!;
    save.version = 3;
    delete save.address;
    save.position = old[500].position
      .clone()
      .add(new Vector3(0, 0, 2400))
      .toArray();
    const restored = new FlightSimulation();
    expect(restoreExpedition(restored, save)).toBe(true);
    expect(
      difference(restored.address, restored.systems[500].address!).distanceTo(
        new Vector3(0, 0, 2400),
      ),
    ).toBeLessThan(1e-8);
    const body = old[500].planets[1],
      patch = new ContactSurface(
        generateContact(body, new Vector3(0, 0, 1)),
        body,
      );
    save.version = 2;
    delete save.rotationTime;
    save.surface.phase = 'landed';
    save.surface.bodyId = body.id;
    save.position = patch.origin
      .clone()
      .addScaledVector(patch.up, 0.003)
      .toArray();
    save.surface.shipPosition = [...save.position];
    expect(restoreExpedition(restored, save)).toBe(true);
    expect(restored.nearest.id).toBe(body.id);
    const current = captureExpedition(source)!;
    current.address!.cells[0] = 0.5;
    const before = source.snapshot();
    expect(parseExpedition(JSON.stringify(current))).toBeNull();
    expect(restoreExpedition(source, current)).toBe(false);
    expect(source.snapshot()).toEqual(before);
  });
});

it('stops safely before exceeding the supported address range', () => {
  const sim = new FlightSimulation();
  sim.setAddress(address([1_000_000_000, 0, 0], new Vector3(499999, 0, 0)));
  sim.updateEnvironment();
  sim.face(sim.position.clone().add(new Vector3(1, 0, 0)));
  sim.speed = 5e12;
  sim.pulse = true;
  sim.throttle = 1;
  const before = sim.address;
  sim.step(0.05, emptyControls());
  expect(sim.address).toEqual(before);
  expect(sim.speed).toBe(0);
  expect(sim.flightMessage).toContain('range limit');
  expect(
    parseExpedition(JSON.stringify(captureExpedition(sim))),
  ).not.toBeNull();
});
