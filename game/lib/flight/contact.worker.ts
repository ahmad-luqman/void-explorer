import { Vector3 } from 'three';
import { generateContact } from './contact';
import { TerrainStorage, TERRAIN_REVISION } from './terrain-storage';
import { validContact } from './terrain-validation';
import type { Body } from './universe';
const storage = new TerrainStorage();
const handle = async (
  event: MessageEvent<{
    body: Omit<Body, 'position'> & { position: number[] };
    center: number[];
    token: number;
  }>,
) => {
  const { body, center, token } = event.data;
  const began = performance.now();
  const signature = JSON.stringify([
    'contact',
    TERRAIN_REVISION,
    body.id,
    body.seed,
    body.radius,
    body.kind,
    body.terrainVersion ?? 1,
  ]);
  const direction = new Vector3().fromArray(center);
  const cached = await storage.read(
    signature,
    (prior) =>
      direction.angleTo(new Vector3().fromArray(prior)) * body.radius < 0.4,
    (data): data is ReturnType<typeof generateContact> =>
      validContact(data) && data.bodyId === body.id,
  );
  const data =
    cached?.payload ??
    generateContact(
      { ...body, position: new Vector3().fromArray(body.position) },
      new Vector3().fromArray(center),
    );
  if (!cached)
    await storage.write(
      signature,
      center,
      data,
      data.positions.byteLength +
        data.colors.byteLength +
        data.heights.byteLength +
        data.indices.byteLength +
        data.axis.byteLength,
    );
  self.postMessage(
    {
      data,
      token,
      cacheHit: !!cached,
      storage: storage.stats,
      generationMs: performance.now() - began,
    },
    {
      transfer: [
        data.axis.buffer,
        data.positions.buffer,
        data.colors.buffer,
        data.heights.buffer,
        data.indices.buffer,
      ],
    },
  );
};

let queue = Promise.resolve();
self.onmessage = (event: Parameters<typeof handle>[0]) => {
  queue = queue
    .then(() => handle(event))
    .catch(() =>
      self.postMessage({
        token: event.data.token,
        error: 'Ground generation failed',
      }),
    );
};
