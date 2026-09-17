import { it, expect } from 'vitest';
import { contactAxis } from '../lib/flight/contact';
import { contactTopology } from '../lib/flight/contact-topology';
it('joins independently sized regions with shared, manifold edges inside the mesh budget', () => {
  for (const mode of ['legacy', 'vista', 'maximum-refinement'] as const) {
    const vista = mode !== 'legacy';
    const m = contactTopology(
      contactAxis(vista, true, vista),
      vista,
      mode === 'maximum-refinement' ? () => 3 : undefined,
    );
    console.log(
      'regional topology',
      vista,
      m.points.length,
      m.indices.length / 3,
      m.leaves,
      m.regions.byteLength,
    );
    expect(m.points.length).toBeLessThan(100000);
    expect(m.indices.length / 3).toBeLessThan(200000);
    const edges = new Map<string, number>();
    for (let i = 0; i < m.indices.length; i += 3) {
      const [a, b, c] = Array.from(m.indices.slice(i, i + 3));
      const [p, q, r] = [m.points[a], m.points[b], m.points[c]];
      expect(
        (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]),
      ).toBeGreaterThan(1e-12);
      for (const [u, v] of [
        [a, b],
        [b, c],
        [c, a],
      ]) {
        const k = u < v ? `${u},${v}` : `${v},${u}`;
        edges.set(k, (edges.get(k) ?? 0) + 1);
      }
    }
    for (const [key, count] of edges) {
      const [a, b] = key
        .split(',')
        .map(Number)
        .map((i) => m.points[i]);
      const outside = [0, 1].some(
        (d) =>
          Math.abs(Math.abs(a[d]) - 76.8) < 1e-7 &&
          Math.abs(a[d] - b[d]) < 1e-7,
      );
      expect(count, `edge ${key}`).toBe(outside ? 1 : 2);
    }
  }
});

import { Vector3 } from 'three';
import { ContactSurface, generateContact } from '../lib/flight/contact';
import { createUniverse } from '../lib/flight/universe';
import { COAST_UP } from '../lib/flight/coast';
import { validContact } from '../lib/flight/terrain-validation';
import { payloadBytes } from '../lib/flight/terrain-storage';
it.each([1, 2, 3, 4, 5] as const)(
  'preserves the protected walking surface in saved terrain profile %s',
  (terrainVersion) => {
    const body = { ...createUniverse()[0].planets[0], terrainVersion };
    const current = new ContactSurface(generateContact(body, COAST_UP), body);
    const prior = new ContactSurface(
      generateContact(body, COAST_UP, 'grid'),
      body,
    );
    expect(validContact(current.data)).toBe(true);
    expect(payloadBytes(current.data)).toBeLessThan(6 * 1024 * 1024);
    for (const x of [-1.1999, -1.1, -0.301, -0.03, 0, 0.035, 0.3, 1.1, 1.1999])
      for (const y of [-1.1999, -1.01, -0.029, 0, 0.04, 0.3, 1.01, 1.1999]) {
        const probe = current.origin
          .clone()
          .addScaledVector(current.east, x)
          .addScaledVector(current.north, y);
        const a = current.sample(probe),
          b = prior.sample(probe);
        expect(a).not.toBeNull();
        expect(b).not.toBeNull();
        expect(a!.point.distanceTo(b!.point)).toBeLessThan(0.000001);
      }
  },
);
it('samples the actual region triangles and shared boundaries without collision holes', () => {
  const body = {
    ...createUniverse()[0].planets[0],
    terrainVersion: 5 as const,
  };
  const patch = new ContactSurface(generateContact(body, COAST_UP), body),
    d = patch.data;
  for (let i = d.coreOffsets!.at(-1)!; i < d.indices.length; i += 303) {
    const center = new Vector3();
    for (let k = 0; k < 3; k++)
      center.add(
        new Vector3()
          .fromArray(d.positions, d.indices[i + k] * 3)
          .multiplyScalar(1 / 3),
      );
    center.applyQuaternion(patch.rotation).add(patch.origin);
    if (!patch.contains(center, 0.1)) continue;
    const sample = patch.sample(center);
    expect(sample, `triangle ${i / 3}`).not.toBeNull();
    expect(sample!.point.distanceTo(center)).toBeLessThan(0.000001);
  }
  for (const edge of [1.2, 2.4, 3, 4.8, 9.6, 18, 19.2, 38.4])
    for (const sign of [-1, 1])
      for (const epsilon of [-0.00001, 0, 0.00001])
        for (const fraction of [-0.97, -0.31, 0, 0.39, 0.96]) {
          const x = sign * edge + epsilon,
            y = edge * fraction;
          if (Math.hypot(x, y) >= 48) continue;
          for (const [a, b] of [
            [x, y],
            [y, x],
          ]) {
            const probe = patch.origin
              .clone()
              .addScaledVector(patch.east, a)
              .addScaledVector(patch.north, b);
            expect(patch.sample(probe), `${a},${b}`).not.toBeNull();
          }
        }
  const broken = structuredClone(d);
  broken.regions![3] = 0;
  expect(validContact(broken)).toBe(false);
  const gap = structuredClone(d);
  gap.coreOffsets![1] += 3;
  expect(validContact(gap)).toBe(false);
});
