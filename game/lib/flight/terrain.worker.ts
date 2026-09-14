import { Vector3 } from 'three';
import { generatePlanetTerrain, type TerrainOptions } from './planet-terrain';
import type { Body } from './universe';
self.onmessage = (
  event: MessageEvent<{
    body: Omit<Body, 'position'>;
    observer: number[];
    token: number;
    quality: string;
    options: TerrainOptions;
  }>,
) => {
  const { body, observer, token, quality, options } = event.data;
  const began = performance.now();
  const result = generatePlanetTerrain(
    { ...body, position: new Vector3() },
    new Vector3().fromArray(observer),
    options,
  );
  self.postMessage(
    {
      id: body.id,
      observer,
      token,
      quality,
      generationMs: performance.now() - began,
      ...result,
    },
    {
      transfer: [
        result.positions.buffer,
        result.colors.buffer,
        result.indices.buffer,
      ],
    },
  );
};
