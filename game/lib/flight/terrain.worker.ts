import { Vector3 } from 'three';
import type { TerrainOptions } from './planet-terrain';
import type { Body } from './universe';
import { TerrainStorage } from './terrain-storage';
import { validPlanetTerrain } from './terrain-validation';
import { terrainRefresh } from './terrain-stream';
import { TerrainCache, terrainSignature } from './terrain-cache';
import { projectTerrain } from './terrain-transition';

const cache = new TerrainCache();
const storage = new TerrainStorage();
const handle = async (
  event: MessageEvent<{
    body: Omit<Body, 'position'>;
    observer: number[];
    token: number;
    quality: string;
    options: TerrainOptions;
    previousKey?: number;
  }>,
) => {
  const { body, observer, token, quality, options, previousKey } = event.data;
  const began = performance.now();
  // Retain the currently displayed source through a possible LRU eviction.
  const previous = cache.get(previousKey);
  const world = { ...body, position: new Vector3() };
  const view = new Vector3().fromArray(observer);
  const signature = terrainSignature(world, quality, options);
  let entry = cache.find(world, view, signature);
  const hit = !!entry;
  let storageHit = false;
  if (!entry) {
    const persisted = await storage.read(
      signature,
      (prior) =>
        !terrainRefresh(
          view,
          new Vector3().fromArray(prior),
          body.radius,
          false,
        ),
      validPlanetTerrain,
    );
    if (persisted) {
      entry = cache.store(signature, persisted.observer, persisted.payload);
      storageHit = true;
    } else {
      entry = cache.resolve(world, view, quality, options).entry;
      await storage.write(signature, entry.observer, entry.mesh, entry.bytes);
    }
  }
  const generatedAt = performance.now();
  const transition =
    previous && previous.key !== entry.key
      ? projectTerrain(previous.mesh, entry.mesh)
      : null;
  // Transfer copies: cached buffers must remain owned by this worker.
  const positions = entry.mesh.positions.slice(),
    colors = entry.mesh.colors.slice(),
    heights = entry.mesh.heights.slice(),
    indices = entry.mesh.indices.slice();
  self.postMessage(
    {
      ...entry.mesh,
      positions,
      colors,
      heights,
      indices,
      id: body.id,
      observer: entry.observer,
      token,
      quality,
      key: entry.key,
      projection: options.projection,
      cacheHit: hit,
      storageHit,
      cache: cache.stats,
      storage: storage.stats,
      generationMs: generatedAt - began,
      transitionMs: performance.now() - generatedAt,
      startPositions: transition?.positions,
      startColors: transition?.colors,
      startHeights: transition?.heights,
      maxDelta: transition?.maxDelta ?? 0,
    },
    {
      transfer: [
        positions.buffer,
        colors.buffer,
        heights.buffer,
        indices.buffer,
        ...(transition
          ? [
              transition.positions.buffer,
              transition.colors.buffer,
              transition.heights.buffer,
            ]
          : []),
      ],
    },
  );
};

// IDB introduces awaits; retain one generation/transition order per worker.
let queue = Promise.resolve();
self.onmessage = (event: Parameters<typeof handle>[0]) => {
  queue = queue
    .then(() => handle(event))
    .catch(() =>
      self.postMessage({
        token: event.data.token,
        error: 'Terrain generation failed',
      }),
    );
};
