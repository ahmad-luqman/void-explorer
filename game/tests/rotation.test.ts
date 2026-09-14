import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { FlightSimulation, emptyControls } from '../lib/flight/simulation';
import {
  ContactSurface,
  generateContact,
  EYE_HEIGHT,
  GEAR_HEIGHT,
} from '../lib/flight/contact';
import {
  fromPlanet,
  planetRotation,
  rotationPeriod,
  toPlanet,
} from '../lib/flight/rotation';
import { generateScenery } from '../lib/flight/scenery';
import { contactRequest } from '../lib/flight/terrain-stream';
import {
  captureExpedition,
  parseExpedition,
  restoreExpedition,
} from '../lib/flight/persistence';
import { createUniverse, worldSurfaceRadius } from '../lib/flight/universe';

function advance(sim: FlightSimulation, seconds: number) {
  for (let i = 0; i < seconds * 20; i++) sim.step(0.05, emptyControls());
}
function land() {
  const sim = new FlightSimulation(),
    body = sim.target;
  const patch = new ContactSurface(
    generateContact(body, new Vector3(0, 0, 1)),
    body,
  );
  sim.position.copy(patch.origin).addScaledVector(patch.up, 10);
  sim.updateEnvironment();
  sim.surface.setPatch(patch);
  expect(sim.surface.land()).toBe(true);
  advance(sim, 15);
  expect(sim.surface.phase).toBe('landed');
  return { sim, body, patch };
}
const close = (a: Vector3, b: Vector3) =>
  expect(a.distanceTo(b)).toBeLessThan(1e-8);

describe('rotating planet frames', () => {
  it('preserves native terrain, contact normals and scenery across a quarter turn, including remote worlds and poles', () => {
    for (const body of [
      createUniverse()[0].planets[0],
      createUniverse(1)[500].planets[1],
    ]) {
      for (const direction of [new Vector3(0, 0, 1), new Vector3(0, 1, 0)]) {
        body.rotationClock = { time: 0 };
        const patch = new ContactSurface(
          generateContact(body, direction),
          body,
        );
        const point = patch.origin
          .clone()
          .addScaledVector(patch.east, 0.0413)
          .addScaledVector(patch.north, 0.0313);
        const ground = patch.sample(point)!;
        const props = generateScenery(patch, patch.origin);
        body.rotationClock.time = rotationPeriod(body) / 4;
        patch.syncRotation();
        const rotated = fromPlanet(point.clone().sub(body.position), body);
        const sample = patch.sample(rotated)!;
        close(
          sample.point,
          fromPlanet(ground.point.clone().sub(body.position), body),
        );
        close(
          sample.normal,
          ground.normal.clone().applyQuaternion(planetRotation(body)),
        );
        expect(sample.water).toBe(ground.water);
        expect(sample.slope).toBeCloseTo(ground.slope, 6);
        const regenerated = generateScenery(patch, patch.origin);
        expect(regenerated.map((p) => p.id)).toEqual(props.map((p) => p.id));
        for (const prop of regenerated) {
          const original = props.find((p) => p.id === prop.id)!;
          close(
            toPlanet(prop.point, body),
            original.point.clone().sub(body.position),
          );
        }
        expect(contactRequest(body, rotated, new Vector3(), patch)).toBeNull();
      }
    }
  });
  it('keeps parked craft and idle walkers fixed to the ground while their world addresses change', () => {
    const { sim, body, patch } = land();
    const ship = toPlanet(sim.position, body),
      before = sim.position.clone();
    const attitude = planetRotation(body).invert().multiply(sim.orientation);
    advance(sim, 60);
    close(toPlanet(sim.position, body), ship);
    expect(sim.position.distanceTo(before)).toBeGreaterThan(50);
    expect(
      planetRotation(body).invert().multiply(sim.orientation).angleTo(attitude),
    ).toBeLessThan(1e-6);
    expect(
      patch.sample(sim.position)!.point.distanceTo(sim.position),
    ).toBeCloseTo(GEAR_HEIGHT, 6);
    expect(sim.surface.exit()).toBe(true);
    const foot = toPlanet(sim.position, body),
      walked = sim.surface.walked;
    const scenery = sim.surface.scenery;
    advance(sim, 60);
    close(toPlanet(sim.position, body), foot);
    close(toPlanet(sim.surface.shipPosition, body), ship);
    expect(sim.surface.walked - walked).toBeLessThan(1e-8);
    expect(sim.surface.scenery).toBe(scenery);
    expect(
      patch.sample(sim.position)!.point.distanceTo(sim.position),
    ).toBeCloseTo(EYE_HEIGHT, 6);
    expect(sim.surface.board()).toBe(true);
    expect(sim.surface.takeoff()).toBe(true);
    advance(sim, 3);
    expect(sim.surface.phase).toBe('flight');
    expect(sim.altitude).toBeGreaterThan(0.11);
    const hovering = toPlanet(sim.position, body);
    advance(sim, 5);
    close(toPlanet(sim.position, body), hovering);
  });
  it('restores both surface phases and their clock only after delayed ground arrives', () => {
    const { sim, body } = land();
    for (const walking of [false, true]) {
      if (walking) expect(sim.surface.exit()).toBe(true);
      advance(sim, 30);
      const save = captureExpedition(sim)!;
      const restored = new FlightSimulation();
      expect(restoreExpedition(restored, save)).toBe(true);
      const position = restored.position.clone();
      advance(restored, 20);
      close(restored.position, position);
      expect(restored.rotationClock.time).toBe(save.rotationTime);
      const target = restored.nearest;
      restored.surface.setPatch(
        new ContactSurface(
          generateContact(
            target,
            restored.position.clone().sub(target.position),
          ),
          target,
        ),
      );
      expect(restored.surface.phase).toBe(walking ? 'walking' : 'landed');
      close(
        toPlanet(restored.surface.shipPosition, target),
        new Vector3().fromArray(save.surface.shipPosition),
      );
      advance(restored, 20);
      close(
        toPlanet(restored.surface.shipPosition, target),
        toPlanet(sim.surface.shipPosition, body),
      );
      if (walking) expect(restored.surface.board()).toBe(true);
      expect(restored.surface.takeoff()).toBe(true);
    }
  });
  it('migrates stationary version-2 surface saves and retains legacy clearings after rotation', () => {
    const source = new FlightSimulation(),
      body = source.target;
    const patch = new ContactSurface(
      generateContact(body, new Vector3(0, 0, 1)),
      body,
    );
    const save = captureExpedition(source)!;
    save.version = 2;
    delete save.rotationTime;
    save.surface.phase = 'landed';
    save.surface.bodyId = body.id;
    save.position = patch.origin
      .clone()
      .addScaledVector(patch.up, GEAR_HEIGHT)
      .toArray();
    save.surface.shipPosition = [...save.position];
    delete save.surface.sceneryVersion;
    delete save.surface.sceneryClearings;
    expect(restoreExpedition(source, save)).toBe(true);
    expect(source.rotationClock.time).toBe(0);
    source.surface.setPatch(patch);
    advance(source, 30);
    const migrated = captureExpedition(source)!;
    expect(migrated.version).toBe(5);
    expect(migrated.surface.sceneryClearings).toHaveLength(2);
    close(
      new Vector3().fromArray(migrated.surface.sceneryClearings![0].point),
      new Vector3().fromArray(save.position),
    );
    expect(restoreExpedition(new FlightSimulation(), migrated)).toBe(true);
  });
  it('keeps space flight inertial, rotates every world from one clock, and resets deterministically', () => {
    const sim = new FlightSimulation(),
      before = sim.position.clone();
    advance(sim, 10);
    close(sim.position, before);
    const remote = sim.systems[400].planets[2];
    expect(planetRotation(remote).angleTo(new Quaternion())).toBeGreaterThan(
      0.01,
    );
    expect(
      planetRotation(sim.activeSystem.star).angleTo(new Quaternion()),
    ).toBe(0);
    const save = captureExpedition(sim)!;
    const restored = new FlightSimulation();
    expect(restoreExpedition(restored, save)).toBe(true);
    expect(restored.rotationClock.time).toBe(sim.rotationClock.time);
    expect(worldSurfaceRadius(new Vector3(1, 0, 0), restored.target)).toBe(
      worldSurfaceRadius(new Vector3(1, 0, 0), sim.target),
    );
    sim.step(0, emptyControls());
    expect(sim.rotationClock.time).toBe(save.rotationTime);
    for (const time of [-1, Infinity, 1e10, undefined]) {
      expect(
        parseExpedition(JSON.stringify({ ...save, rotationTime: time })),
      ).toBeNull();
    }
    sim.reset();
    expect(sim.rotationClock.time).toBe(0);
    expect(planetRotation(remote).angleTo(new Quaternion())).toBe(0);
  });
});
