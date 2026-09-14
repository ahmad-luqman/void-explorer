import { sampleBiome } from './biomes';
import { Vector3 } from 'three';
import { surfaceRadius, elevation, type Body } from './universe';
import { terrainColor } from './terrain';

const GRID = 1024;
const MAX_DEPTH = 9;
export type TerrainOptions = {
  pixels?: number;
  projection?: number;
  maxLeaves?: number;
};
type CubePoint = [number, number, number];
type Tile = {
  face: number;
  u: number;
  v: number;
  size: number;
  depth: number;
  score: number;
};
export type PlanetTerrain = {
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  leaves: number;
  maxDepth: number;
  maxErrorPixels: number;
};
function cube(face: number, u: number, v: number): CubePoint {
  const axis = face >> 1,
    sign = face % 2 ? -1 : 1;
  const p: CubePoint = [0, 0, 0];
  p[axis] = sign * GRID;
  p[(axis + 1) % 3] = u;
  p[(axis + 2) % 3] = v * sign;
  return p;
}
function corners(t: Tile) {
  return [
    [t.u, t.v],
    [t.u + t.size, t.v],
    [t.u + t.size, t.v + t.size],
    [t.u, t.v + t.size],
  ].map(([u, v]) => cube(t.face, u, v));
}
// A max heap makes the geometry budget favor the largest visible approximation errors.
class Queue {
  items: Tile[] = [];
  push(t: Tile) {
    const a = this.items;
    let i = a.length;
    a.push(t);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (a[parent].score >= t.score) break;
      a[i] = a[parent];
      i = parent;
    }
    a[i] = t;
  }
  pop() {
    const a = this.items,
      first = a[0],
      last = a.pop()!;
    if (!a.length) return first;
    let i = 0;
    while (i * 2 + 1 < a.length) {
      let child = i * 2 + 1;
      if (child + 1 < a.length && a[child + 1].score > a[child].score) child++;
      if (a[child].score <= last.score) break;
      a[i] = a[child];
      i = child;
    }
    a[i] = last;
    return first;
  }
}

export function generatePlanetTerrain(
  body: Body,
  observer: Vector3,
  options: TerrainOptions = {},
): PlanetTerrain {
  const pixels = options.pixels ?? 2,
    projection = options.projection ?? 850;
  const budget = Math.max(384, Math.min(6000, options.maxLeaves ?? 3000));
  const samples = new Map<string, Vector3>();
  const sample = (p: CubePoint) => {
    const key = p.join(',');
    let value = samples.get(key);
    if (!value) {
      value = new Vector3(...p).normalize();
      value.multiplyScalar(surfaceRadius(value, body));
      samples.set(key, value);
    }
    return value;
  };
  const make = (
    face: number,
    u: number,
    v: number,
    size: number,
    depth: number,
  ): Tile => {
    const t = { face, u, v, size, depth, score: 0 };
    const points = corners(t),
      center = sample(cube(face, u + size / 2, v + size / 2));
    const vertices = points.map(sample);
    const average = vertices
      .reduce((sum, p) => sum.add(p), new Vector3())
      .multiplyScalar(0.25);
    let error = center.distanceTo(average);
    for (let i = 0; i < 4; i++) {
      const a = points[i],
        b = points[(i + 1) % 4];
      const mid: CubePoint = [
        (a[0] + b[0]) / 2,
        (a[1] + b[1]) / 2,
        (a[2] + b[2]) / 2,
      ];
      error = Math.max(
        error,
        sample(mid).distanceTo(
          vertices[i]
            .clone()
            .add(vertices[(i + 1) % 4])
            .multiplyScalar(0.5),
        ),
      );
    }
    const width = Math.max(...vertices.map((p) => p.distanceTo(center)));
    // The back hemisphere remains covered by coarse tiles. The near side uses
    // geometric deviation projected into pixels, with a finite near-ground limit.
    const visible =
      center.clone().normalize().dot(observer.clone().normalize()) > -0.2;
    t.score =
      depth < 3
        ? 1e10
        : visible
          ? (error * projection) /
            Math.max(8, observer.distanceTo(center) - width)
          : 0;
    if (depth >= MAX_DEPTH) t.score = 0;
    return t;
  };
  const queue = new Queue();
  for (let face = 0; face < 6; face++)
    queue.push(make(face, -GRID, -GRID, GRID * 2, 0));
  while (queue.items[0].score > pixels && queue.items.length + 3 <= budget) {
    const t = queue.pop(),
      half = t.size / 2;
    for (const [x, y] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ])
      queue.push(
        make(t.face, t.u + x * half, t.v + y * half, half, t.depth + 1),
      );
  }
  const leaves = queue.items.sort(
    (a, b) => a.face - b.face || a.u - b.u || a.v - b.v,
  );

  // Register every leaf corner on its cube-space edge line. Coarse boundaries
  // then include all neighboring fine corners, including across cube faces.
  // Both sides share the same indices: no T-junctions, skirts, or depth overlap.
  const lines = new Map<string, Map<number, CubePoint>>();
  const edge = (a: CubePoint, b: CubePoint) => {
    const axis = a.findIndex((v, i) => v !== b[i]);
    const key = `${axis}:${a[(axis + 1) % 3]}:${a[(axis + 2) % 3]}`;
    return { axis, key };
  };
  for (const tile of leaves) {
    const pts = corners(tile);
    for (let i = 0; i < 4; i++) {
      const a = pts[i],
        b = pts[(i + 1) % 4],
        { axis, key } = edge(a, b);
      let line = lines.get(key);
      if (!line) {
        line = new Map();
        lines.set(key, line);
      }
      line.set(a[axis], a);
      line.set(b[axis], b);
    }
  }
  const ordered = new Map(
    [...lines].map(([key, values]) => [
      key,
      [...values].sort((a, b) => a[0] - b[0]),
    ]),
  );
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  const vertices = new Map<string, number>();
  const vertex = (p: CubePoint) => {
    const key = p.join(',');
    const found = vertices.get(key);
    if (found !== undefined) return found;
    const point = sample(p),
      direction = point.clone().normalize();
    const index = positions.length / 3;
    positions.push(point.x, point.y, point.z);
    const color = terrainColor(
      elevation(direction, body) / body.radius,
      body.kind,
      0.94 +
        0.06 *
          Math.abs(
            Math.sin(direction.x * 127 + direction.y * 83 + direction.z * 59),
          ),
      sampleBiome(direction, body),
    );
    colors.push(color.r, color.g, color.b);
    vertices.set(key, index);
    return index;
  };
  for (const tile of leaves) {
    const pts = corners(tile),
      boundary: number[] = [];
    for (let i = 0; i < 4; i++) {
      const a = pts[i],
        b = pts[(i + 1) % 4],
        { axis, key } = edge(a, b);
      const entries = ordered
        .get(key)!
        .filter(
          ([n]) =>
            n >= Math.min(a[axis], b[axis]) && n <= Math.max(a[axis], b[axis]),
        );
      if (a[axis] > b[axis]) entries.reverse();
      for (const [, p] of entries.slice(0, -1)) boundary.push(vertex(p));
    }
    const center = vertex(
      cube(tile.face, tile.u + tile.size / 2, tile.v + tile.size / 2),
    );
    for (let i = 0; i < boundary.length; i++)
      indices.push(center, boundary[i], boundary[(i + 1) % boundary.length]);
  }
  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
    leaves: leaves.length,
    maxDepth: Math.max(...leaves.map((t) => t.depth)),
    maxErrorPixels: Math.max(...leaves.map((t) => t.score)),
  };
}
