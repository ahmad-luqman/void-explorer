import { expect, it } from 'vitest';
import { Matrix4, Vector3 } from 'three';
import {
  createCloudLayer,
  createCoastalCloudBanks,
} from '../lib/flight/clouds';
import { createUniverse, surfaceRadius } from '../lib/flight/universe';
it('keeps a bounded cloud shell above the shared planetary terrain', () => {
  const body = createUniverse()[0].planets[0];
  const mesh = createCloudLayer(
    body,
    { value: 0 },
    { value: new Vector3(0, 0, 1) },
    { value: new Vector3(0, 1, 0) },
  );
  const positions = mesh.geometry.attributes.position;
  expect(mesh.geometry.index!.count / 3).toBeLessThan(17000);
  const point = new Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i);
    const radius = point.length();
    expect(
      Math.abs(radius - surfaceRadius(point.normalize(), body) - 18),
    ).toBeLessThan(0.002);
  }
  mesh.geometry.dispose();
  mesh.material.dispose();
});
it('keeps coastal billows bounded and well above the rotating native terrain', () => {
  const body = {
    ...createUniverse()[0].planets[0],
    terrainVersion: 4 as const,
  };
  const mesh = createCoastalCloudBanks(body);
  expect(mesh.count).toBe(72);
  expect((mesh.geometry.index!.count / 3) * mesh.count).toBeLessThan(13000);
  const matrix = new Matrix4(),
    point = new Vector3();
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, matrix);
    point.setFromMatrixPosition(matrix);
    const radius = point.length();
    expect(radius - surfaceRadius(point.normalize(), body)).toBeGreaterThan(2);
  }
  mesh.geometry.dispose();
  (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(
    (m) => m.dispose(),
  );
});
