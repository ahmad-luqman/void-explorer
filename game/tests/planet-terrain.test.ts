import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { generatePlanetTerrain } from '../lib/flight/planet-terrain';
import { createUniverse, surfaceRadius } from '../lib/flight/universe';
const body = createUniverse()[0].planets[0];
describe('adaptive cube-sphere terrain', () => {
  it('refines toward the observer and respects a hard geometry budget', () => {
    const far = generatePlanetTerrain(body, new Vector3(0, 0, body.radius * 8));
    const near = generatePlanetTerrain(
      body,
      new Vector3(0, 0, body.radius + 25),
    );
    expect(near.leaves).toBeLessThanOrEqual(3000);
    expect(near.maxDepth).toBeGreaterThan(far.maxDepth);
    expect(near.positions.length / 3).toBeLessThan(18000);
    expect(near.indices.length / 3).toBeLessThan(36000);
    const low = generatePlanetTerrain(
      body,
      new Vector3(0, 0, body.radius + 25),
      { pixels: 5, maxLeaves: 1500 },
    );
    expect(low.leaves).toBeLessThan(near.leaves);
  });
  it('joins all refinement boundaries and cube faces into a closed outward mesh', () => {
    const mesh = generatePlanetTerrain(body, new Vector3(900, 430, 890), {
      maxLeaves: 1300,
    });
    const edges = new Map<string, number>();
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const ids = Array.from(mesh.indices.slice(i, i + 3));
      const [a, b, c] = ids.map((n) =>
        new Vector3().fromArray(mesh.positions, n * 3),
      );
      expect(b.sub(a).cross(c.sub(a)).dot(a)).toBeGreaterThan(0);
      for (let j = 0; j < 3; j++) {
        const x = ids[j],
          y = ids[(j + 1) % 3],
          key = `${Math.min(x, y)}:${Math.max(x, y)}`;
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    expect([...edges.values()].every((count) => count === 2)).toBe(true);
    expect(
      mesh.positions.length / 3 - edges.size + mesh.indices.length / 3,
    ).toBe(2);
  });
  it('shares the deterministic world heightfield, including sea level', () => {
    const observer = new Vector3(0, 0, 1250);
    const a = generatePlanetTerrain(body, observer, { maxLeaves: 600 });
    const b = generatePlanetTerrain(body, observer, { maxLeaves: 600 });
    expect(a).toEqual(b);
    for (let i = 0; i < a.positions.length; i += 3) {
      const p = new Vector3().fromArray(a.positions, i),
        radius = p.length();
      expect(
        Math.abs(radius - surfaceRadius(p.normalize(), body)),
      ).toBeLessThan(0.001);
    }
  });
});
