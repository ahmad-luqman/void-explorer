import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { contactRequest, terrainRefresh } from '../lib/flight/terrain-stream';
import { ContactSurface, generateContact } from '../lib/flight/contact';
import { createUniverse } from '../lib/flight/universe';
const body = createUniverse()[0].planets[0];
const patch = new ContactSurface(
  generateContact(body, new Vector3(0, 0, 1)),
  body,
);
describe('terrain streaming decisions', () => {
  it('requests ground ahead before the ship reaches the dense boundary', () => {
    const position = patch.origin
      .clone()
      .addScaledVector(patch.east, 0.5)
      .addScaledVector(patch.up, 0.1);
    const direction = contactRequest(
      body,
      position,
      patch.east.clone().multiplyScalar(10),
      patch,
    )!;
    expect(direction).not.toBeNull();
    const next = new ContactSurface(generateContact(body, direction), body);
    const relative = next.coordinates(position);
    expect(Math.hypot(relative.x, relative.y)).toBeLessThan(0.351);
    expect(next.sample(position)).not.toBeNull();
    expect(contactRequest(body, position, new Vector3(), next)).toBeNull();
  });
  it('keeps coverage behind an abrupt turn and does not rebuild while stationary', () => {
    const position = patch.origin.clone().addScaledVector(patch.up, 0.1);
    expect(contactRequest(body, position, new Vector3(), patch)).toBeNull();
    const direction = contactRequest(
      body,
      position,
      patch.east.clone().multiplyScalar(100),
      null,
    )!;
    const ahead = new ContactSurface(generateContact(body, direction), body);
    expect(
      contactRequest(
        body,
        position,
        patch.east.clone().multiplyScalar(-100),
        ahead,
      ),
    ).toBeNull();
    expect(ahead.sample(position)).not.toBeNull();
  });
  it('refreshes planetary detail after meaningful movement or quality changes', () => {
    const start = new Vector3(0, 0, body.radius + 100);
    expect(
      terrainRefresh(
        start.clone().multiplyScalar(1.0001),
        start,
        body.radius,
        false,
      ),
    ).toBe(false);
    expect(
      terrainRefresh(
        new Vector3(0, 0, body.radius + 60),
        start,
        body.radius,
        false,
      ),
    ).toBe(true);
    expect(
      terrainRefresh(
        new Vector3(0, 0, body.radius + 170),
        start,
        body.radius,
        false,
      ),
    ).toBe(true);
    expect(terrainRefresh(start, start, body.radius, true)).toBe(true);
    expect(
      terrainRefresh(
        start.clone().applyAxisAngle(new Vector3(0, 1, 0), 0.1),
        start,
        body.radius,
        false,
      ),
    ).toBe(true);
  });
});
