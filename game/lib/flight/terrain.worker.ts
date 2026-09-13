import { Vector3 } from 'three';
import { generatePatch } from './terrain';
import type { Body } from './universe';
self.onmessage = (
  event: MessageEvent<{
    body: Omit<Body, 'position'>;
    center: number[];
    token: number;
  }>,
) => {
  const { body, center, token } = event.data;
  const result = generatePatch(
    { ...body, position: new Vector3() },
    new Vector3().fromArray(center),
  );
  self.postMessage(
    { id: body.id, center, token, ...result },
    { transfer: [result.positions.buffer, result.colors.buffer] },
  );
};
