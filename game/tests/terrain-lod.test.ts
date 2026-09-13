import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { createUniverse, surfaceRadius } from '../lib/flight/universe';
import {
  ContactSurface,
  generateContact,
  CONTACT_RADIUS,
} from '../lib/flight/contact';
import { createTerrainSkirt } from '../lib/flight/terrain-seam';
const body = createUniverse()[0].planets[0];
describe('graded terrain coverage', () => {
  it('keeps a dense core and bounded mesh extending to the horizon', () => {
    const data = generateContact(body, new Vector3(0, 0, 1));
    expect(data.positions.length / 3).toBeLessThan(90000);
    expect(data.extent).toBeGreaterThan(CONTACT_RADIUS);
    const mid = data.axis.length >> 1;
    expect(data.axis[mid + 1] - data.axis[mid]).toBeCloseTo(0.01875);
    for (let i = 1; i < data.axis.length; i++)
      expect(data.axis[i]).toBeGreaterThan(data.axis[i - 1]);
    expect(
      data.axis[data.axis.length - 1] - data.axis[data.axis.length - 2],
    ).toBeLessThanOrEqual(2.00001);
  });
  it('has no contact holes through the core and progressively wider cells', () => {
    const patch = new ContactSurface(
      generateContact(body, new Vector3(0.13, 0.27, 1).normalize()),
      body,
    );
    for (const distance of [0, 0.001, 0.6, 1.05, 1.2, 2, 8, 16, 32, 47.9])
      for (let i = 0; i < 24; i++) {
        const p = patch.origin
          .clone()
          .addScaledVector(patch.east, Math.cos(i) * distance)
          .addScaledVector(patch.north, Math.sin(i) * distance);
        const sample = patch.sample(p);
        expect(sample).not.toBeNull();
        expect(sample!.normal.dot(patch.up)).toBeGreaterThan(0.5);
      }
    expect(
      patch.sample(patch.origin.clone().addScaledVector(patch.east, 49)),
    ).toBeNull();
  });
  it('closes its far boundary with a continuous buried skirt', () => {
    const patch = new ContactSurface(
        generateContact(body, new Vector3(0, 0, 1)),
        body,
      ),
      skirt = createTerrainSkirt(patch);
    expect(skirt.positions.every(Number.isFinite)).toBe(true);
    for (let i = 0; i < skirt.positions.length; i += 6) {
      const top = new Vector3().fromArray(skirt.positions, i).add(patch.origin),
        bottom = new Vector3()
          .fromArray(skirt.positions, i + 3)
          .add(patch.origin);
      const sample = patch.sample(top)!;
      expect(sample).not.toBeNull();
      expect(
        Math.abs(top.clone().sub(sample.point).dot(patch.up) - 0.002),
      ).toBeLessThan(0.00002);
      expect(bottom.distanceTo(body.position)).toBeLessThan(
        surfaceRadius(bottom.clone().sub(body.position).normalize(), body) - 10,
      );
    }
    expect(Array.from(skirt.positions.slice(0, 6))).toEqual(
      Array.from(skirt.positions.slice(-6)),
    );
  });
  it('preserves terrain height when the walking grid recenters', () => {
    const a = new ContactSurface(
        generateContact(body, new Vector3(0, 0, 1)),
        body,
      ),
      position = a.origin.clone().addScaledVector(a.east, 0.66);
    const b = new ContactSurface(
      generateContact(body, position.clone().sub(body.position).normalize()),
      body,
    );
    expect(
      a.sample(position)!.point.distanceTo(b.sample(position)!.point),
    ).toBeLessThan(0.00005);
  });
});
