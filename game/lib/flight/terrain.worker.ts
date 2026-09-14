import { Vector3 } from 'three';
import type { TerrainOptions } from './planet-terrain';
import type { Body } from './universe';
import { TerrainCache } from './terrain-cache';
import { projectTerrain } from './terrain-transition';

const cache = new TerrainCache();
self.onmessage = (
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
  const { entry, hit } = cache.resolve(
    { ...body, position: new Vector3() },
    new Vector3().fromArray(observer),
    quality,
    options,
  );
  const generatedAt = performance.now();
  const transition =
    previous && previous.key !== entry.key
      ? projectTerrain(previous.mesh, entry.mesh)
      : null;
  // Transfer copies: cached buffers must remain owned by this worker.
  const positions = entry.mesh.positions.slice(),
    colors = entry.mesh.colors.slice(),
    indices = entry.mesh.indices.slice();
  self.postMessage(
    {
      ...entry.mesh,
      positions,
      colors,
      indices,
      id: body.id,
      observer: entry.observer,
      token,
      quality,
      key: entry.key,
      projection: options.projection,
      cacheHit: hit,
      cache: cache.stats,
      generationMs: generatedAt - began,
      transitionMs: performance.now() - generatedAt,
      startPositions: transition?.positions,
      startColors: transition?.colors,
      maxDelta: transition?.maxDelta ?? 0,
    },
    {
      transfer: [
        positions.buffer,
        colors.buffer,
        indices.buffer,
        ...(transition
          ? [transition.positions.buffer, transition.colors.buffer]
          : []),
      ],
    },
  );
};
