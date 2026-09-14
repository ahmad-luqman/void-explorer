import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Every added shape fits radius 1 and height [0, 1]. The shared prop capsule
// therefore encloses crowns, stems and columns on either rendering backend.
export function explorationGeometry(shape: 'fan' | 'succulent' | 'landmark') {
  const pieces: T.BufferGeometry[] = [];
  const column = (
    r: number,
    h: number,
    x: number,
    z: number,
    top = r * 0.72,
  ) => {
    const geo = new T.CylinderGeometry(top, r, h, 5, 1);
    geo.translate(x, h / 2, z);
    pieces.push(geo);
  };
  if (shape === 'landmark') {
    column(0.3, 1, 0, 0);
    column(0.28, 0.72, 0.6, 0.05);
    column(0.24, 0.48, -0.48, 0.38);
    column(0.21, 0.62, -0.4, -0.46);
  } else if (shape === 'fan') {
    column(0.1, 0.64, 0, 0, 0.06);
    // Broad folded diamond leaves form an alien fan crown, not a conifer.
    const vertices: number[] = [];
    for (let i = 0; i < 7; i++) {
      const a = (i * Math.PI * 2) / 7;
      const point = (angle: number, r: number, y: number) => [
        Math.cos(angle) * r,
        y,
        Math.sin(angle) * r,
      ];
      const base = [0, 0.48, 0],
        tip = point(a, 0.95, 0.95);
      const left = point(a - 0.25, 0.62, 0.78),
        right = point(a + 0.25, 0.62, 0.78);
      const ridge = point(a, 0.5, 1);
      vertices.push(
        ...base,
        ...left,
        ...ridge,
        ...left,
        ...tip,
        ...ridge,
        ...tip,
        ...right,
        ...ridge,
        ...right,
        ...base,
        ...ridge,
      );
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    pieces.push(geo);
  } else {
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      column(
        0.25,
        0.6 + (i % 3) * 0.2,
        Math.cos(a) * 0.48,
        Math.sin(a) * 0.48,
        0.12,
      );
    }
    column(0.24, 1, 0, 0, 0.08);
  }
  // Strip UVs so the custom fan leaves and primitive pieces share attributes.
  const flat = pieces.map((g) => {
    const result = g.index ? g.toNonIndexed() : g.clone();
    result.deleteAttribute('uv');
    return result;
  });
  const merged = mergeGeometries(flat)!;
  [...pieces, ...flat].forEach((g) => g.dispose());
  return merged;
}
