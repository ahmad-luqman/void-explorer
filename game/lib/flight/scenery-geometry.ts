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
    // Three staggered fractured spires; ring offsets and uneven crowns break
    // the straight cylinder silhouette while remaining inside the capsule.
    for (let n = 0; n < 3; n++) {
      const r = [0.38, 0.3, 0.24][n],
        h = [1, 0.72, 0.46][n];
      const x = [0, 0.52, -0.49][n],
        z = [0, 0.06, 0.32][n];
      const g = new T.CylinderGeometry(r * 0.62, r, h, 6, 3);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i) + h / 2;
        const t = y / h;
        const angle = Math.atan2(p.getZ(i), p.getX(i));
        const jagged = 0.83 + 0.17 * Math.sin(angle * 3 + t * 8 + n);
        p.setXYZ(
          i,
          x + p.getX(i) * jagged + Math.sin(t * 3 + n) * 0.08 * t,
          y * (0.93 + 0.07 * Math.sin(angle * 2 + n)),
          z + p.getZ(i) * jagged - t * 0.08,
        );
      }
      g.computeVertexNormals();
      pieces.push(g);
    }
    for (const x of [-0.5, 0.45]) {
      const rock = new T.IcosahedronGeometry(1, 0);
      rock.scale(0.33, 0.11, 0.3);
      rock.translate(x, 0.11, -0.35);
      pieces.push(rock);
    }
  } else if (shape === 'fan') {
    column(0.12, 0.25, 0, 0, 0.08);
    // Broad folded diamond leaves form an alien fan crown, not a conifer.
    const vertices: number[] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i * Math.PI * 2) / 9;
      const point = (angle: number, r: number, y: number) => [
        Math.cos(angle) * r,
        y,
        Math.sin(angle) * r,
      ];
      const base = [0, 0.03, 0],
        tip = point(a, 0.92, 0.78 + (i % 3) * 0.1);
      const left = point(a - 0.35, 0.66, 0.52),
        right = point(a + 0.35, 0.66, 0.52);
      const ridge = point(a, 0.46, 0.82);
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
  const p = merged.attributes.position;
  const colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const leaf = Math.floor(i / 12);
    const c =
      shape === 'fan'
        ? new T.Color(['#497e7c', '#73a39a', '#ab768e', '#3c626a'][leaf % 4])
        : new T.Color('#ffffff');
    c.multiplyScalar(
      0.76 + 0.24 * p.getY(i) + (Math.floor(i / 3) % 3) * 0.045,
    ).toArray(colors, i * 3);
  }
  merged.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  merged.computeVertexNormals();
  return merged;
}
