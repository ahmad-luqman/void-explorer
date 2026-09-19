import { BufferGeometry, Color, Float32BufferAttribute } from 'three';
import type { SurfaceProp } from './scenery';

export type RockFormation = 'gravel' | 'outcrop' | 'cliff';

// Visual detail follows stable size/identity, never camera distance. Positions,
// normals and conservative collision capsules still come from SurfaceProp.
export function rockFormation(prop: SurfaceProp): RockFormation | undefined {
  if (prop.shape === 'landmark' && prop.id.includes(':coast:')) return 'cliff';
  if (prop.shape || prop.mineral) return;
  if (prop.radius < 0.001) return 'gravel';
  if (prop.radius >= 0.003 && prop.id.includes(':vista:hero:'))
    return 'outcrop';
}

// Closed, split rock masses in radius 1, height [0,1]. Broad caps and offset
// shoulders carry the silhouette; narrow recesses shade the vertical joints.
export function rockFormationGeometry(shape: RockFormation, variant = 0) {
  const vertices: number[] = [],
    occlusion: number[] = [];
  const triangle = (a: number[], b: number[], c: number[], exposure = 1) => {
    vertices.push(...a, ...b, ...c);
    occlusion.push(exposure);
  };
  const column = (
    x: number,
    z: number,
    radius: number,
    height: number,
    phase: number,
  ) => {
    const sides = 10;
    const widths = [
      [1, 0.97, 0.72, 0.71],
      [1, 0.84, 0.87, 0.61],
      [1, 0.91, 0.69, 0.67],
    ][variant];
    if (shape === 'outcrop') {
      widths[2] *= 0.9;
      widths[3] *= 0.6;
    }
    const levels = [0, 0.29, 0.67, 0.96];
    const crown = [0.92, 0.97, 0.81, 0.85, 0.99, 0.91, 0.94, 0.79, 0.9, 0.95];
    const point = (ring: number, side: number) => {
      const angle = ((side % sides) * Math.PI * 2) / sides + phase;
      // One continuous vertical joint on each face, instead of noisy chips.
      const cleft =
        (side % sides === 2 || side % sides === 7) && ring > 0 ? 0.64 : 1;
      const r =
        radius *
        widths[ring] *
        cleft *
        (0.9 + 0.07 * Math.sin(angle * 3 + phase));
      const t = levels[ring];
      return [
        x + Math.cos(angle) * r + radius * t * 0.1,
        height *
          (ring === 3
            ? crown[(side + variant * 3) % sides]
            : t + (ring ? 0.035 * Math.cos(angle + phase) : 0)),
        z + Math.sin(angle) * r - radius * t * 0.08,
      ];
    };
    for (let ring = 0; ring < 3; ring++)
      for (let side = 0; side < sides; side++) {
        const a = point(ring, side),
          b = point(ring, side + 1),
          c = point(ring + 1, side),
          d = point(ring + 1, side + 1);
        const recess = [1, 2, 6, 7].includes(side) ? 0.79 : 1;
        triangle(a, c, b, recess);
        triangle(b, c, d, recess);
      }
    for (let side = 0; side < sides; side++) {
      triangle(point(0, side), point(0, side + 1), [x, 0, z]);
      triangle(point(3, side + 1), point(3, side), [
        x + radius * 0.096,
        height * 0.91,
        z - radius * 0.0768,
      ]);
    }
  };
  const chip = (x: number, z: number, r: number, h: number) => {
    const corners = [
      [x - r, 0, z],
      [x, 0, z + r],
      [x + r, 0, z],
      [x, 0, z - r],
    ];
    for (let side = 0; side < 4; side++) {
      triangle(corners[side], corners[(side + 1) % 4], [
        x - r * 0.17,
        h,
        z + r * 0.12,
      ]);
      triangle(corners[side], [x, 0, z], corners[(side + 1) % 4]);
    }
  };
  if (shape === 'gravel') {
    chip(0, 0, 0.98, 0.88);
  } else if (shape === 'cliff') {
    column(-0.25, -0.06, 0.38, 1, 0.22 + variant * 0.14);
    column(0.36, 0.07, 0.28, [0.76, 0.9, 0.64][variant], 0.48);
    column(-0.29, 0.46, 0.23, [0.43, 0.36, 0.58][variant], -0.21);
    for (let i = 0; i < 4; i++) {
      const angle = i * 2.4 + 0.3;
      chip(
        Math.cos(angle) * 0.69,
        Math.sin(angle) * 0.69,
        0.18,
        0.09 + i * 0.012,
      );
    }
  } else {
    column(0.06, -0.13, 0.69, 1, 0.3 + variant * 0.17);
    column(-0.42, 0.38, 0.31, [0.51, 0.66, 0.4][variant], -0.2);
    chip(0.6, 0.44, 0.18, 0.16);
    chip(-0.65, -0.36, 0.19, 0.2);
    chip(0.23, 0.72, 0.17, 0.13);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  const position = geometry.getAttribute('position'),
    normal = geometry.getAttribute('normal');
  const colors: number[] = [];
  for (let i = 0; i < position.count; i += 3) {
    const x =
      (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3;
    const y =
      (position.getY(i) + position.getY(i + 1) + position.getY(i + 2)) / 3;
    const z =
      (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3;
    const exposed = Math.max(0, normal.getY(i));
    const vein = Math.sin(x * 5 + z * 3 + variant) * Math.sin(y * 4 - z * 5);
    const c = new Color().setRGB(
      0.84 + exposed * 0.14 + vein * 0.06,
      0.82 + exposed * 0.07 + vein * 0.02,
      0.94 - exposed * 0.04,
    );
    c.multiplyScalar(
      (0.74 + Math.sqrt(Math.max(0, y)) * 0.26) * occlusion[i / 3],
    );
    for (let corner = 0; corner < 3; corner++) colors.push(c.r, c.g, c.b);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}
