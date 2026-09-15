import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Every added shape fits radius 1 and height [0, 1]. The shared prop capsule
// therefore encloses crowns, stems and columns on either rendering backend.
export function explorationGeometry(
  shape: 'fan' | 'succulent' | 'landmark' | 'rock',
  variant = 0,
) {
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
  const fracture = (
    x: number,
    z: number,
    r: number,
    h: number,
    seed: number,
  ) => {
    const sides = 7,
      rings = 4;
    const vertices: number[] = [];
    const point = (ring: number, side: number) => {
      const a = ((side % sides) * Math.PI * 2) / sides;
      const phase = seed + variant * 1.8;
      const t = ring / (rings - 1);
      const width = [
        [1, 0.78, 0.83, 0.52],
        [1, 0.92, 0.61, 0.58],
        [1, 0.63, 0.72, 0.35],
      ][variant % 3][ring];
      const irregular = 0.83 + 0.14 * Math.sin(a * 3 + phase);
      return [
        x + Math.cos(a) * r * width * irregular + t * r * 0.17,
        h * t * (0.89 + 0.1 * Math.sin(a * 2 + phase)),
        z + Math.sin(a) * r * width * irregular - t * r * 0.12,
      ];
    };
    for (let ring = 0; ring < rings - 1; ring++)
      for (let side = 0; side < sides; side++) {
        const a = point(ring, side),
          b = point(ring, side + 1),
          c = point(ring + 1, side),
          d = point(ring + 1, side + 1);
        vertices.push(...a, ...c, ...b, ...b, ...c, ...d);
      }
    for (let side = 0; side < sides; side++) {
      vertices.push(...point(0, side), ...point(0, side + 1), x, 0, z);
      vertices.push(
        ...point(rings - 1, side + 1),
        ...point(rings - 1, side),
        x + r * 0.17,
        h * 0.87,
        z - r * 0.12,
      );
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    g.computeVertexNormals();
    pieces.push(g);
  };
  if (shape === 'landmark') {
    // Long fissures between offset buttresses, chipped crowns and basal scree.
    fracture(-0.15, 0, 0.32, 1, 0.3);
    fracture(0.42, 0.08, 0.24, [0.69, 0.91, 0.52][variant % 3], 1.7);
    fracture(-0.46, 0.3, 0.22, [0.44, 0.35, 0.71][variant % 3], 3.2);
    for (let i = 0; i < 6; i++) {
      const a = i * 2.4;
      const rock = new T.IcosahedronGeometry(1, 0);
      rock.scale(0.2, 0.07 + (i % 3) * 0.025, 0.18);
      rock.translate(
        Math.cos(a) * 0.65,
        0.07 + (i % 3) * 0.025,
        Math.sin(a) * 0.65,
      );
      pieces.push(rock);
    }
  } else if (shape === 'rock') {
    fracture(0, 0, 0.91, 1, 2.6);
    const buttress = new T.IcosahedronGeometry(1, 0);
    buttress.scale(0.3, 0.24, 0.28);
    buttress.translate(-0.47, 0.24, 0.33);
    pieces.push(buttress);
  } else if (shape === 'fan') {
    column(0.08, 0.23, 0, 0, 0.04);
    const vertices: number[] = [];
    // Three broad pleated fans have an upright silhouette and visible leaf faces.
    for (let crown = 0; crown < 3; crown++) {
      const yaw = crown * 2.4;
      const point = (x: number, y: number, z: number) => [
        Math.cos(yaw) * x - Math.sin(yaw) * z,
        y,
        Math.sin(yaw) * x + Math.cos(yaw) * z,
      ];
      for (let leaf = 0; leaf < 5; leaf++) {
        const angle = (leaf - 2) * 0.32;
        const radius = 0.78 - crown * 0.07;
        const x = Math.sin(angle) * radius,
          y = 0.15 + Math.cos(angle) * radius;
        const base = point(0, 0.035, 0),
          left = point(x - 0.14, y - 0.06, 0.18 + crown * 0.08),
          tip = point(x, y, 0.22 + crown * 0.08),
          right = point(x + 0.14, y - 0.06, 0.18 + crown * 0.08),
          fold = point(x * 0.5, y * 0.57, 0.08);
        vertices.push(
          ...base,
          ...left,
          ...fold,
          ...left,
          ...tip,
          ...fold,
          ...tip,
          ...right,
          ...fold,
          ...right,
          ...base,
          ...fold,
        );
      }
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
  const stone = shape === 'rock' || shape === 'landmark';
  for (let face = 0; face < p.count; face += 3) {
    const x = (p.getX(face) + p.getX(face + 1) + p.getX(face + 2)) / 3,
      y = (p.getY(face) + p.getY(face + 1) + p.getY(face + 2)) / 3,
      z = (p.getZ(face) + p.getZ(face + 1) + p.getZ(face + 2)) / 3;
    const mineral =
      Math.sin(x * 8 + z * 5 + variant * 1.7) * Math.sin(y * 9 - z * 4);
    // Coherent patches on the stone, warm exposed crowns and shaded bases.
    // Flat face colors retain facets without the former repeating triangle stripes.
    const c = stone
      ? new T.Color()
          .setRGB(
            0.9 + mineral * 0.07,
            0.85 + mineral * 0.04,
            0.94 - mineral * 0.03,
          )
          .multiplyScalar(0.7 + 0.3 * Math.sqrt(Math.max(0, y)))
      : shape === 'fan'
        ? new T.Color(
            ['#59918c', '#86ada0', '#bc8092', '#456e75'][
              Math.floor(Math.floor(face / 12) / 5) % 4
            ],
          )
        : new T.Color('#ffffff');
    if (!stone)
      c.multiplyScalar(0.72 + 0.23 * y + (Math.floor(face / 3) % 5) * 0.028);
    for (let corner = 0; corner < 3; corner++)
      c.toArray(colors, (face + corner) * 3);
  }
  merged.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  merged.computeVertexNormals();
  return merged;
}
