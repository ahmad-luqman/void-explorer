import { it, expect } from 'vitest';
import { Vector3 } from 'three';
import { createUniverse, surfaceRadius } from '../lib/flight/universe';
import { generatePatch } from '../lib/flight/terrain';
it('local terrain uses the same surface as flight collision and regenerates identically', () => {
  const body = createUniverse()[0].planets[0],
    center = new Vector3(0, 0, 1);
  const patch = generatePatch(body, center),
    again = generatePatch(body, center);
  expect(patch.positions).toEqual(again.positions);
  expect(patch.colors).toEqual(again.colors);
  const p = new Vector3();
  for (let i = 0; i < patch.positions.length; i += 357) {
    p.fromArray(patch.positions, i);
    const distance = p.length();
    expect(
      Math.abs(distance - surfaceRadius(p.normalize(), body)),
    ).toBeLessThan(0.001);
  }
  for (let i = 0; i < patch.positions.length; i += 918) {
    const a = new Vector3().fromArray(patch.positions, i),
      b = new Vector3().fromArray(patch.positions, i + 3),
      c = new Vector3().fromArray(patch.positions, i + 6);
    expect(b.sub(a).cross(c.sub(a)).dot(a)).toBeGreaterThan(0);
  }
});
