import {
  prepareContactRenderData,
  contactRenderBuffers,
} from './contact-render-data';
import { Vector3 } from 'three';
import { generateContact } from './contact';
import { TerrainStorage, TERRAIN_REVISION } from './terrain-storage';
import { validContact } from './terrain-validation';
import type { Body } from './universe';
import { prepareScenery } from './scenery-preparation';
import { groundTextureData } from './ground-texture';
const storage = new TerrainStorage();
const handle = async (
  event: MessageEvent<{
    body: Omit<Body, 'position'> & { position: number[] };
    center: number[];
    focus: number[];
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
  const world = { ...body, position: new Vector3().fromArray(body.position) };
  const data =
    cached?.payload ?? generateContact(world, new Vector3().fromArray(center));
  if (!cached)
    await storage.write(
      signature,
      center,
      data,
      data.positions.byteLength +
        data.colors.byteLength +
        data.heights.byteLength +
        data.indices.byteLength +
        data.axis.byteLength +
        (data.coreOffsets?.byteLength ?? 0) +
        (data.regions?.byteLength ?? 0),
    );
  const generatedAt = performance.now();
  const render = prepareContactRenderData(data, world);
  const preparedAt = performance.now();
  const scenery = prepareScenery(
    data,
    world,
    new Vector3().fromArray(event.data.focus),
  );
  self.postMessage(
    {
      data,
      render,
      scenery,
      preparationMs: preparedAt - generatedAt,
      sceneryPreparationMs: performance.now() - preparedAt,
      token,
      cacheHit: !!cached,
      storage: storage.stats,
      generationMs: generatedAt - began,
    },
    {
      transfer: [
        data.axis.buffer,
        data.positions.buffer,
        data.colors.buffer,
        data.heights.buffer,
        data.indices.buffer,
        ...(data.coreOffsets ? [data.coreOffsets.buffer] : []),
        ...(data.regions ? [data.regions.buffer] : []),
        ...contactRenderBuffers(render),
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

// Prepare the shared material once while the title/orbit is interactive. Worker
// messages are ordered, so this reaches the renderer before any contact mesh
// can trigger the otherwise synchronous first-use texture generator.
const textureBegan = performance.now();
const groundTexture = groundTextureData();
self.postMessage(
  { groundTexture, preparationMs: performance.now() - textureBegan },
  { transfer: [groundTexture.buffer] },
);
