import { Vector3 } from 'three';
import { CONTACT_RADIUS, ContactSurface } from './contact';

// The coarse globe interpolates different triangles. A buried skirt closes the
// far boundary even when those triangles lie below the detailed surface.
export function createTerrainSkirt(patch: ContactSurface) {
  const count = 1024,
    positions = new Float32Array((count + 1) * 6),
    colors = new Float32Array(positions.length),
    indices = new Uint32Array(count * 6);
  for (let i = 0; i <= count; i++) {
    const angle = ((i % count) / count) * Math.PI * 2;
    const probe = patch.origin
      .clone()
      .addScaledVector(patch.east, Math.cos(angle) * (CONTACT_RADIUS - 0.002))
      .addScaledVector(patch.north, Math.sin(angle) * (CONTACT_RADIUS - 0.002));
    const sample = patch.sample(probe);
    if (!sample) throw new Error('Missing terrain seam contact');
    const point = sample.point
      .sub(patch.origin)
      .applyQuaternion(patch.rotation.clone().invert());
    const localUp = new Vector3().fromArray(patch.data.up);
    point
      .clone()
      .addScaledVector(localUp, 0.002)
      .toArray(positions, i * 6);
    point
      .addScaledVector(localUp, -patch.body.radius * 0.03)
      .toArray(positions, i * 6 + 3);
    // Skirts remain below the surface and use the same biome palette.
    const c = patch.data.colors,
      coord = patch.coordinates(probe);
    let col = 0,
      row = 0;
    while (patch.data.axis[col + 1] < coord.x) col++;
    while (patch.data.axis[row + 1] < coord.y) row++;
    const offset = (row * (patch.data.resolution + 1) + col) * 3;
    for (let k = 0; k < 6; k++) colors[i * 6 + k] = c[offset + (k % 3)];
    if (i < count) {
      const a = i * 2;
      indices.set([a, a + 1, a + 2, a + 2, a + 1, a + 3], i * 6);
    }
  }
  return { positions, colors, indices };
}
