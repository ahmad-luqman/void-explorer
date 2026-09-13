import { Color, Vector3 } from 'three';
import { type Body, elevation } from './universe';
export const PATCH_COS = Math.cos(0.22);
export function terrainColor(
  height: number,
  kind: Body['kind'],
  variation = 1,
) {
  const palettes = {
    ocean: ['#092e50', '#11647b', '#369d9e', '#665d9c', '#be83ce'],
    desert: ['#41213b', '#87405c', '#b56c73', '#d69b87', '#f9d7b4'],
    ice: ['#174358', '#377e8f', '#84b7c9', '#b0ccdf', '#e5e5f9'],
  };
  if (kind === 'ocean' && height < 0.0002) {
    const deep = new Color('#092e50'),
      shallow = new Color('#248e9c');
    return (
      height <= 0
        ? deep.lerp(shallow, Math.exp(height / 0.006))
        : shallow.lerp(new Color('#72afa6'), Math.min(1, height / 0.0002))
    ).multiplyScalar(variation);
  }
  const index =
    kind === 'ocean'
      ? height <= 0.00015
        ? 0
        : height < 0.005
          ? 1
          : height < 0.015
            ? 2
            : height < 0.03
              ? 3
              : 4
      : Math.min(4, Math.max(0, Math.floor((height + 0.06) * 43)));
  return new Color(palettes[kind][index]).multiplyScalar(variation);
}
export function generatePatch(body: Body, center: Vector3) {
  const up =
    Math.abs(center.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
  const u = new Vector3().crossVectors(up, center).normalize(),
    v = new Vector3().crossVectors(center, u).normalize();
  const resolution = 160,
    extent = 0.25,
    positions = new Float32Array(resolution * resolution * 18),
    colors = new Float32Array(positions.length);
  const vertices: Vector3[] = [],
    heights: number[] = [];
  for (let y = 0; y <= resolution; y++)
    for (let x = 0; x <= resolution; x++) {
      const d = center
        .clone()
        .addScaledVector(u, ((x / resolution) * 2 - 1) * extent)
        .addScaledVector(v, ((y / resolution) * 2 - 1) * extent)
        .normalize();
      const h = elevation(d, body);
      heights.push(h);
      vertices.push(
        d.multiplyScalar(
          body.radius + (body.kind === 'ocean' ? Math.max(0, h) : h),
        ),
      );
    }
  let offset = 0;
  for (let y = 0; y < resolution; y++)
    for (let x = 0; x < resolution; x++) {
      const a = y * (resolution + 1) + x,
        b = a + 1,
        c = a + resolution + 1,
        d = c + 1;
      for (const tri of [
        [a, b, d],
        [a, d, c],
      ]) {
        const h = tri.reduce((sum, i) => sum + heights[i], 0) / 3 / body.radius;
        const color = terrainColor(
          h,
          body.kind,
          0.94 + 0.06 * Math.abs(Math.sin(x * 7.13 + y * 9.27)),
        );
        for (const i of tri) {
          vertices[i].toArray(positions, offset);
          color.toArray(colors, offset);
          offset += 3;
        }
      }
    }
  return { positions, colors };
}
