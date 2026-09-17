import { it, expect } from 'vitest';
import { Vector3 } from 'three';
import {
  prepareContactRenderData,
  contactRenderBuffers,
} from '../lib/flight/contact-render-data';
import { generateContact, ContactSurface } from '../lib/flight/contact';
import { createUniverse } from '../lib/flight/universe';
import { COAST_UP } from '../lib/flight/coast';
it('transfers ready-to-render ground without changing contact or persistent buffers', () => {
  const body = createUniverse()[0].planets[0];
  body.terrainVersion = 5;
  const data = generateContact(body, COAST_UP);
  const positions = data.positions.slice(),
    indices = data.indices.slice();
  const patch = new ContactSurface(data, body),
    before = patch.sample(patch.origin)!;
  const render = prepareContactRenderData(data, body);
  expect(data.positions).toEqual(positions);
  expect(data.indices).toEqual(indices);
  expect(render.normals.length).toBe(data.positions.length);
  expect(render.smooth.length).toBe(data.heights.length);
  for (let i = 0; i < render.normals.length; i += 3)
    expect(new Vector3().fromArray(render.normals, i).length()).toBeCloseTo(
      1,
      5,
    );
  const buffers = contactRenderBuffers(render);
  expect(new Set(buffers).size).toBe(buffers.length);
  expect(buffers.reduce((n, b) => n + b.byteLength, 0)).toBeLessThan(
    2 * 1024 * 1024,
  );
  const received = structuredClone(
    { data, render },
    {
      transfer: [
        ...buffers,
        data.positions.buffer,
        data.colors.buffer,
        data.heights.buffer,
        data.indices.buffer,
        data.axis.buffer,
      ],
    },
  );
  expect(render.normals.byteLength).toBe(0);
  const restored = new ContactSurface(received.data, body);
  expect(
    restored.sample(restored.origin)!.point.distanceTo(before.point),
  ).toBeLessThan(1e-10);
  expect(received.render.skirt.normals.length).toBe(
    received.render.skirt.positions.length,
  );
});
