import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export function siteGeometry(shape: 'relay' | 'crystal') {
  const parts: T.BufferGeometry[] = [];
  const box = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const g = new T.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    parts.push(g);
  };
  if (shape === 'relay') {
    box(1.25, 0.13, 1.1, 0, 0.065, 0);
    box(0.92, 0.17, 0.76, 0, 0.205, 0);
    box(0.26, 0.7, 0.46, -0.3, 0.64, 0);
    box(0.24, 0.53, 0.48, 0.3, 0.555, 0);
    box(0.86, 0.1, 0.5, 0, 0.38, 0);
    box(0.8, 0.055, 0.54, 0, 0.88, 0);
  } else {
    for (const [x, z, r, h] of [
      [0, 0, 0.48, 1],
      [-0.44, 0.24, 0.29, 0.66],
      [0.39, -0.31, 0.28, 0.78],
    ]) {
      const g = new T.CylinderGeometry(r * 0.15, r, h * 0.72, 5, 1);
      g.translate(x, h * 0.36, z);
      parts.push(g);
      const tip = new T.ConeGeometry(r * 0.15, h * 0.28, 5);
      tip.translate(x, h * 0.86, z);
      parts.push(tip);
    }
  }
  const prepared = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(prepared)!;
  for (const g of [...parts, ...prepared]) g.dispose();
  const p = merged.attributes.position,
    colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 3) {
    const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const c = new T.Color().setRGB(
      0.65 + y * 0.35,
      0.72 + y * 0.28,
      0.8 + y * 0.2,
    );
    for (let j = 0; j < 3; j++) c.toArray(colors, (i + j) * 3);
  }
  merged.setAttribute('color', new T.BufferAttribute(colors, 3));
  merged.computeVertexNormals();
  return merged;
}
