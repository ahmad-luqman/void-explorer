import { toPlanet } from '../lib/flight/rotation';
import { Vector3 } from 'three';
import { describe, it, expect } from 'vitest';
import { FlightSimulation, emptyControls } from '../lib/flight/simulation';
import { ContactSurface, generateContact } from '../lib/flight/contact';
import {
  captureExpedition,
  parseExpedition,
  restoreExpedition,
} from '../lib/flight/persistence';
const advance = (s: FlightSimulation, t: number) => {
  for (let i = 0; i < t * 60; i++) s.step(1 / 60, emptyControls());
};
describe('expedition saves', () => {
  it('restores flight stopped at the same address', () => {
    const a = new FlightSimulation();
    a.speed = 400;
    a.visited.add(9);
    const save = captureExpedition(a)!;
    const b = new FlightSimulation();
    expect(restoreExpedition(b, save)).toBe(true);
    expect(b.position.toArray()).toEqual(a.position.toArray());
    expect(b.speed).toBe(0);
    expect(b.visited.has(9)).toBe(true);
  });
  it('rejects corrupt saves without changing the current expedition', () => {
    const s = new FlightSimulation(),
      before = s.snapshot(),
      save = captureExpedition(s)!;
    expect(parseExpedition('{broken')).toBeNull();
    expect(parseExpedition(JSON.stringify({ ...save, version: 1 }))).toBeNull();
    expect(restoreExpedition(s, { ...save, target: 'p9999-0' })).toBe(false);
    expect(restoreExpedition(s, { ...save, orientation: [0, 0, 0, 0] })).toBe(
      false,
    );
    expect(s.snapshot()).toEqual(before);
  });
  it('restores an excursion only after real ground contact is available', () => {
    const a = new FlightSimulation();
    a.descend();
    advance(a, 40);
    const body = a.nearest,
      dir = a.position.clone().sub(body.position).normalize(),
      patch = new ContactSurface(generateContact(body, dir), body);
    a.surface.setPatch(patch);
    a.surface.land();
    expect(captureExpedition(a)).toBeNull();
    advance(a, 15);
    a.surface.exit();
    const save = captureExpedition(a)!;
    const b = new FlightSimulation();
    expect(restoreExpedition(b, save)).toBe(true);
    expect(b.surface.phase).toBe('restoring');
    advance(b, 1);
    expect(
      toPlanet(b.position, b.nearest).distanceTo(
        new Vector3().fromArray(save.position),
      ),
    ).toBeLessThan(1e-8);
    b.surface.setPatch(
      new ContactSurface(
        generateContact(
          body,
          b.position.clone().sub(body.position).normalize(),
        ),
        body,
      ),
    );
    expect(b.surface.phase).toBe('walking');
    expect(
      toPlanet(b.surface.shipPosition, b.nearest).distanceTo(
        new Vector3().fromArray(save.surface.shipPosition),
      ),
    ).toBeLessThan(1e-8);
    expect(b.surface.board()).toBe(true);
    expect(b.surface.takeoff()).toBe(true);
  });
  it('rejects a grounded save floating far above its planet', () => {
    const s = new FlightSimulation(),
      save = captureExpedition(s)!;
    save.surface.phase = 'walking';
    save.surface.bodyId = s.target.id;
    expect(restoreExpedition(s, save)).toBe(false);
  });
});
