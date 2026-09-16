import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { generatePlanetTerrain } from '../lib/flight/planet-terrain';
import { createUniverse } from '../lib/flight/universe';
import {
  blendTerrain,
  projectTerrain,
  protectContact,
} from '../lib/flight/terrain-transition';
import { TerrainCache } from '../lib/flight/terrain-cache';

const body = createUniverse()[0].planets[0];
const observer = new Vector3(0, 0, body.radius + 100);
const options = { maxLeaves: 600, projection: 500, pixels: 2 };
describe('planetary mesh transitions', () => {
  it('projects new vertices onto the prior radial surface with finite bounded colors', () => {
    const coarse = generatePlanetTerrain(body, observer, options);
    const fine = generatePlanetTerrain(body, observer, {
      ...options,
      maxLeaves: 1200,
    });
    const projected = projectTerrain(coarse, fine);
    expect(projected.matched / (fine.positions.length / 3)).toBeGreaterThan(
      0.995,
    );
    expect(projected.maxDelta).toBeGreaterThan(0);
    expect(projected.maxDelta).toBeLessThan(body.radius * 0.15);
    expect(
      [...projected.colors].every(
        (x) => Number.isFinite(x) && x >= 0 && x <= 1,
      ),
    ).toBe(true);
    const same = projectTerrain(coarse, coarse);
    expect(same.maxDelta).toBeLessThan(0.001);
    const output = new Float32Array(fine.positions.length);
    blendTerrain(output, projected.positions, fine.positions, 0);
    expect(output).toEqual(projected.positions);
    blendTerrain(output, projected.positions, fine.positions, 1);
    expect(output).toEqual(fine.positions);
    blendTerrain(output, projected.positions, fine.positions, 0.5);
    for (let i = 0; i < output.length; i++)
      expect(
        Math.abs(output[i] - (projected.positions[i] + fine.positions[i]) / 2),
      ).toBeLessThan(0.001);
  });
  it('keeps triangles outward during refinement and coarsening', () => {
    const coarse = generatePlanetTerrain(body, observer, options);
    const fine = generatePlanetTerrain(body, observer, {
      ...options,
      maxLeaves: 1200,
    });
    for (const [from, to] of [
      [coarse, fine],
      [fine, coarse],
    ]) {
      const projected = projectTerrain(from, to);
      const current = new Float32Array(to.positions.length);
      blendTerrain(current, projected.positions, to.positions, 0.5);
      const a = new Vector3(),
        b = new Vector3(),
        c = new Vector3();
      for (let i = 0; i < to.indices.length; i += 3) {
        a.fromArray(current, to.indices[i] * 3);
        b.fromArray(current, to.indices[i + 1] * 3).sub(a);
        c.fromArray(current, to.indices[i + 2] * 3).sub(a);
        expect(b.cross(c).dot(a)).toBeGreaterThan(0);
      }
    }
  });
  it('holds contact coverage fixed and tapers deformation toward the horizon', () => {
    const final = new Float32Array([1, 0, 0, 15, 0, 0, 25, 0, 0]);
    const from = new Float32Array([1, 8, 0, 15, 8, 0, 25, 8, 0]);
    const depth = new Float32Array([-8, -8, -8]);
    protectContact(from, final, new Vector3(), 10, [
      { from: depth, to: new Float32Array([0, 0, 0]), size: 1 },
    ]);
    expect([...depth]).toEqual([0, -4, -8]);
    expect([...from]).toEqual([1, 0, 0, 15, 4, 0, 25, 8, 0]);
  });
});
describe('bounded worker terrain reuse', () => {
  it('reuses compatible views but isolates geometry, quality, and viewport inputs', () => {
    const cache = new TerrainCache();
    const first = cache.resolve(body, observer, 'high', options);
    expect(first.hit).toBe(false);
    const revisit = cache.resolve(
      body,
      observer.clone().addScalar(0.01),
      'high',
      options,
    );
    expect(revisit.hit).toBe(true);
    expect(revisit.entry).toBe(first.entry);
    expect(revisit.entry.observer).toEqual(observer.toArray());
    for (const [world, quality, config] of [
      [body, 'low', options],
      [body, 'high', { ...options, projection: 800 }],
      [{ ...body, seed: body.seed + 1 }, 'high', options],
    ] as const)
      expect(cache.resolve(world, observer, quality, config).hit).toBe(false);
    // Transfer buffers are copies, keeping the reusable source intact.
    const copy = first.entry.mesh.positions.slice();
    structuredClone(copy, { transfer: [copy.buffer] });
    expect(first.entry.mesh.positions.byteLength).toBeGreaterThan(0);
  });
  it('evicts least recently used meshes and never exceeds either budget', () => {
    const cache = new TerrainCache(1000000, 2);
    const first = cache.resolve(body, observer, 'high', options);
    const second = cache.resolve(
      body,
      observer.clone().negate(),
      'high',
      options,
    );
    expect(cache.resolve(body, observer, 'high', options).hit).toBe(true);
    cache.resolve(body, new Vector3(body.radius + 100, 0, 0), 'high', options);
    expect(cache.get(first.entry.key)).toBeDefined();
    expect(cache.get(second.entry.key)).toBeUndefined();
    expect(cache.stats.entries).toBe(2);
    expect(cache.stats.evictions).toBe(1);
    expect(cache.stats.bytes).toBeLessThanOrEqual(cache.byteLimit);
    const tiny = new TerrainCache(1);
    tiny.resolve(body, observer, 'high', options);
    expect(tiny.stats.bytes).toBe(0);
    expect(tiny.stats.entries).toBe(0);
  });
});
