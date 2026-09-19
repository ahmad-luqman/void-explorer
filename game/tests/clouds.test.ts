import { expect, it } from 'vitest';
import { Mesh, ShaderMaterial, Vector3 } from 'three';
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
it.each([4, 5] as const)(
  'keeps expanded coastal billows above profile %s terrain',
  (terrainVersion) => {
    const body = {
      ...createUniverse()[0].planets[0],
      terrainVersion,
    };
    const mesh = createCoastalCloudBanks(
      body,
      { value: new Vector3(0, 1, 0) },
      { value: new Vector3(0, 0, 1) },
      { value: 1 },
    );
    expect(mesh.children.length).toBe(16);
    expect(mesh.userData.cloudTextures.length).toBe(1);
    expect(
      new Set(mesh.children.map((child) => (child as Mesh).material)).size,
    ).toBe(1);
    let bytes = 0;
    for (const texture of mesh.userData.cloudTextures) {
      bytes += texture.image.data.byteLength;
      expect(
        texture.image.data.some((v: number, i: number) => i % 4 === 0 && v > 0),
      ).toBe(true);
    }
    expect(bytes).toBe(4 * 48 ** 3 * 4);
    let triangles = 0;
    for (const child of mesh.children) {
      const bank = child as Mesh;
      triangles += bank.geometry.index!.count / 3;
      const point = bank.position.clone(),
        radius = point.length();
      expect(radius - surfaceRadius(point.normalize(), body)).toBeGreaterThan(
        2.7,
      );
      // Check the enlarged bank's bottom across its full oriented footprint,
      // including corners, rather than only the clear air at its center.
      for (const x of [-1, -0.5, 0, 0.5, 1])
        for (const z of [-1, -0.5, 0, 0.5, 1]) {
          const bottom = new Vector3(
            x * bank.scale.x,
            -bank.scale.y,
            z * bank.scale.z,
          )
            .applyQuaternion(bank.quaternion)
            .add(bank.position);
          const clearance =
            bottom.length() - surfaceRadius(bottom.clone().normalize(), body);
          expect(clearance).toBeGreaterThan(0.5);
        }
      expect((bank.material as ShaderMaterial).depthWrite).toBe(false);
      bank.geometry.dispose();
      (bank.material as ShaderMaterial).dispose();
    }
    expect(triangles).toBe(192);
    for (const texture of mesh.userData.cloudTextures) texture.dispose();
  },
);

import { PerspectiveCamera } from 'three';
import { cloudDensity, CLOUD_VOXELS } from '../lib/flight/cloud-volume';
it('keeps noise out of empty volume space and preserves seeded density', () => {
  const n = CLOUD_VOXELS,
    a = cloudDensity(31),
    b = cloudDensity(31);
  expect(a).toEqual(b);
  expect(cloudDensity(32)).not.toEqual(a);
  for (let z = 0; z < n; z++)
    for (let y = n - 3; y < n; y++)
      for (let x = 0; x < n; x++) {
        const at =
          ((Math.floor(z / 8) * n + y) * (8 * n) + (z % 8) * n + x) * 4;
        expect(a[at]).toBe(0);
      }
});
it('tracks camera coordinates and sunlight through world rotation and floating-origin shifts', () => {
  const body = {
    ...createUniverse()[0].planets[0],
    terrainVersion: 5 as const,
  };
  const key = { value: new Vector3(1, 0, 0) },
    secondary = { value: new Vector3(1, 0, 0) };
  const group = createCoastalCloudBanks(body, key, secondary, { value: 1 });
  group.position.set(400, -200, 100);
  group.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), 0.8);
  group.updateMatrixWorld(true);
  const bank = group.children[2] as Mesh,
    material = bank.material as ShaderMaterial;
  const eye = new Vector3(0.2, -0.1, 0.3),
    camera = new PerspectiveCamera();
  camera.position.copy(bank.localToWorld(eye.clone()));
  camera.updateMatrixWorld(true);
  bank.onBeforeRender(null!, null!, camera, null!, null!, null!);
  expect(material.uniforms.bankEye.value.distanceTo(eye)).toBeLessThan(1e-9);
  const up = new Vector3(0, 1, 0).applyQuaternion(bank.quaternion);
  key.value.copy(up);
  secondary.value.copy(up);
  bank.onBeforeRender(null!, null!, camera, null!, null!, null!);
  expect(material.uniforms.bankDay.value).toBe(1);
  expect(material.uniforms.bankScale.value.equals(bank.scale)).toBe(true);
  const diagonalSun = new Vector3(0.3, 0.8, -0.4).normalize();
  key.value.copy(diagonalSun).applyQuaternion(bank.quaternion);
  secondary.value.copy(key.value);
  bank.onBeforeRender(null!, null!, camera, null!, null!, null!);
  expect(material.uniforms.bankSun.value.distanceTo(diagonalSun)).toBeLessThan(
    1e-9,
  );
  key.value.copy(up);
  key.value.negate();
  secondary.value.copy(key.value);
  bank.onBeforeRender(null!, null!, camera, null!, null!, null!);
  expect(material.uniforms.bankDay.value).toBe(0);
  for (const child of group.children) {
    (child as Mesh).geometry.dispose();
    ((child as Mesh).material as ShaderMaterial).dispose();
  }
  for (const texture of group.userData.cloudTextures) texture.dispose();
});
