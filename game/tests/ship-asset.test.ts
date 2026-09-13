import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { Box3, Vector3, Mesh } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
async function load() {
  const bytes = readFileSync(
    new URL('../public/models/aurora-v1.glb', import.meta.url),
  );
  return new GLTFLoader().parseAsync(
    bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer,
    '',
  );
}
describe('authored spacecraft contract', () => {
  it('exports the expected physical size and orientation', async () => {
    const { scene } = await load();
    const box = new Box3().setFromObject(scene),
      size = box.getSize(new Vector3());
    expect(size.x).toBeCloseTo(28.8, 2);
    expect(size.z).toBeGreaterThan(17);
    expect(size.z).toBeLessThan(20);
    expect(box.min.z).toBeLessThan(-9);
    expect(box.min.y).toBeCloseTo(-3, 4);
  });
  it('keeps deployable gear and two rear emission cores addressable', async () => {
    const { scene } = await load();
    const gear = scene.getObjectByName('LandingGear');
    expect(gear).toBeDefined();
    expect(new Box3().setFromObject(gear!).min.y).toBeCloseTo(-3, 4);
    const cores: Mesh[] = [];
    scene.traverse((o) => {
      if (o.name.startsWith('EngineCore_') && (o as Mesh).isMesh)
        cores.push(o as Mesh);
    });
    expect(cores).toHaveLength(2);
    for (const core of cores) {
      const center = new Box3().setFromObject(core).getCenter(new Vector3());
      expect(center.z).toBeGreaterThan(7.5);
      expect(center.y).toBeCloseTo(0.2, 3);
    }
  });
  it('stays compact and self-contained for the static game', async () => {
    const gltf = await load();
    let meshes = 0,
      triangles = 0;
    gltf.scene.traverse((o) => {
      if ((o as Mesh).isMesh) {
        meshes++;
        const g = (o as Mesh).geometry;
        triangles += (g.index?.count || g.attributes.position.count) / 3;
      }
    });
    expect(meshes).toBeLessThanOrEqual(14);
    expect(triangles).toBeLessThan(5000);
    expect(gltf.parser.json.images || []).toHaveLength(0);
    expect(
      gltf.parser.json.buffers.every((b: { uri?: string }) => !b.uri),
    ).toBe(true);
  });
});
