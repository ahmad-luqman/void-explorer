import { expect, it } from 'vitest';
import { Vector3 } from 'three';
import { TerrainStorage, payloadBytes } from '../lib/flight/terrain-storage';
import {
  validPlanetTerrain,
  validContact,
} from '../lib/flight/terrain-validation';
import { generatePlanetTerrain } from '../lib/flight/planet-terrain';
import { generateContact } from '../lib/flight/contact';
import { createUniverse } from '../lib/flight/universe';
it('rejects corrupt disk geometry and retains finite native contact data', () => {
  const body = createUniverse()[0].planets[0];
  const mesh = generatePlanetTerrain(body, new Vector3(0, 0, 1100), {
    maxLeaves: 400,
  });
  expect(validPlanetTerrain(mesh)).toBe(true);
  expect(payloadBytes(mesh)).toBe(
    mesh.positions.byteLength +
      mesh.colors.byteLength +
      mesh.heights.byteLength +
      mesh.indices.byteLength,
  );
  mesh.indices[0] = mesh.positions.length;
  expect(validPlanetTerrain(mesh)).toBe(false);
  const ground = generateContact(body, new Vector3(0, 0, 1));
  expect(validContact(ground)).toBe(true);
  ground.positions[0] = NaN;
  expect(validContact(ground)).toBe(false);
});
it('treats unavailable or denied storage as a cache miss', async () => {
  const cache = new TerrainStorage({
    open() {
      throw new Error('denied');
    },
  } as unknown as IDBFactory);
  expect(await cache.read('test', () => true, validPlanetTerrain)).toBeNull();
  expect(cache.stats.available).toBe(false);
  await cache.write('test', [0, 0, 1], {}, 20);
  expect(cache.stats.writes).toBe(0);
  expect(cache.stats.errors).toBe(1);
});
