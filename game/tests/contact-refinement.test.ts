import { expect, it } from 'vitest';
import { Vector3 } from 'three';
import { coastalRefinement } from '../lib/flight/contact-refinement';
import {
  contactTopology,
  type ContactTopology,
} from '../lib/flight/contact-topology';
import { contactAxis } from '../lib/flight/contact';
import { COAST_UP, coastDirection } from '../lib/flight/coast';
import {
  createUniverse,
  elevation,
  surfaceRadius,
} from '../lib/flight/universe';

it('resolves coastal ledges more accurately within the same geometry ceiling', () => {
  const body = {
    ...createUniverse()[0].planets[0],
    terrainVersion: 5 as const,
  };
  const up = COAST_UP.clone(),
    east = new Vector3(0, 1, 0).cross(up).normalize(),
    north = up.clone().cross(east),
    origin = up.clone().multiplyScalar(surfaceRadius(up, body));
  const axis = contactAxis(true, true, true);
  const regular = contactTopology(axis, true);
  const refined = contactTopology(
    axis,
    true,
    coastalRefinement(body, origin, east, north),
  );
  const height = (x: number, y: number) =>
    elevation(
      origin
        .clone()
        .addScaledVector(east, x)
        .addScaledVector(north, y)
        .normalize(),
      body,
    );
  function interpolator(m: ContactTopology) {
    const heights = m.points.map(([x, y]) => height(x, y));
    return (x: number, y: number) => {
      let id = 0;
      while (m.regions[id * 6 + 3] >= 0) {
        const k = id * 6,
          [left, bottom, size, child] = m.regions.subarray(k, k + 4);
        id =
          child +
          (x >= (left + size / 2) * 0.075 ? 1 : 0) +
          (y >= (bottom + size / 2) * 0.075 ? 2 : 0);
      }
      const start = m.regions[id * 6 + 4],
        end = start + m.regions[id * 6 + 5];
      for (let i = start; i < end; i += 3) {
        const [a, b, c] = m.indices.subarray(i, i + 3),
          [p, q, r] = [m.points[a], m.points[b], m.points[c]];
        const denominator =
          (q[1] - r[1]) * (p[0] - r[0]) + (r[0] - q[0]) * (p[1] - r[1]);
        const u =
          ((q[1] - r[1]) * (x - r[0]) + (r[0] - q[0]) * (y - r[1])) /
          denominator;
        const v =
          ((r[1] - p[1]) * (x - r[0]) + (p[0] - r[0]) * (y - r[1])) /
          denominator;
        if (u >= -1e-7 && v >= -1e-7 && u + v <= 1 + 1e-7)
          return heights[a] * u + heights[b] * v + heights[c] * (1 - u - v);
      }
      throw new Error(`Missing coastal triangle ${x},${y}`);
    };
  }
  const before = interpolator(regular),
    after = interpolator(refined);
  let oldError = 0,
    newError = 0,
    count = 0;
  for (let z = 3.137; z < 17; z += 0.379)
    for (let x = -9.271; x < 9; x += 0.419) {
      const point = coastDirection(x, z, body.radius)
        .multiplyScalar(body.radius)
        .sub(origin);
      const tx = point.dot(east),
        ty = point.dot(north),
        exact = height(tx, ty);
      if (exact < -0.025) continue;
      oldError += Math.abs(before(tx, ty) - exact);
      newError += Math.abs(after(tx, ty) - exact);
      count++;
    }
  console.log('coastal refinement', {
    vertices: refined.points.length,
    triangles: refined.indices.length / 3,
    samples: count,
    oldMeanMeters: (oldError / count) * 1000,
    newMeanMeters: (newError / count) * 1000,
  });
  expect(count).toBeGreaterThan(250);
  expect(newError).toBeLessThan(oldError * 0.75);
  expect(refined.points.length).toBeLessThan(100000);
  expect(refined.indices.length / 3).toBeLessThan(200000);
});
