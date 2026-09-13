import { Vector3 } from 'three';
import { generateContact } from './contact';
import type { Body } from './universe';
self.onmessage = (
  event: MessageEvent<{
    body: Omit<Body, 'position'> & { position: number[] };
    center: number[];
    token: number;
  }>,
) => {
  const { body, center, token } = event.data;
  const data = generateContact(
    { ...body, position: new Vector3().fromArray(body.position) },
    new Vector3().fromArray(center),
  );
  self.postMessage(
    { data, token },
    {
      transfer: [
        data.positions.buffer,
        data.colors.buffer,
        data.indices.buffer,
      ],
    },
  );
};
