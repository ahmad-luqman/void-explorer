import { contactTopology, type ContactTopology } from './contact-topology';
import { coastalRefinement } from './contact-refinement';
import { COAST_UP } from './coast';
import { sampleBiome } from './biomes';
import { Quaternion, Ray, Vector3 } from 'three';
import { type Body, elevation, surfaceRadius } from './universe';
import {
  fromPlanet,
  localDirection,
  planetRotation,
  toPlanet,
} from './rotation';
import { terrainColor } from './terrain';

export const SHIP_SCALE = 0.004;
export const GEAR_HEIGHT = 0.003;
export const EYE_HEIGHT = 0.0018;
export const BOARD_DISTANCE = 0.055;
export const CONTACT_RADIUS = 48;
export const CONTACT_CORE = 1.2;

// Shared vertices join the dense walking grid to progressively wider terrain cells.
export function contactAxis(
  detailed = false,
  foreground = false,
  vista = false,
) {
  if (detailed) {
    const positive = [0];
    if (foreground) {
      for (let i = 1; i <= 12; i++) positive.push(i * 0.0046875);
      for (let i = 1; i <= 26; i++) positive.push(0.05625 + i * 0.009375);
    } else {
      for (let i = 1; i <= 32; i++) positive.push(i * 0.009375);
    }
    const middleCells = vista ? 32 : 48;
    for (let i = 1; i <= middleCells; i++)
      positive.push(0.3 + i * (vista ? 0.028125 : 0.01875));
    let step = 0.9 / middleCells;
    while (positive[positive.length - 1] < 64) {
      const near = positive[positive.length - 1] < 3;
      step = vista
        ? Math.min(
            near ? 0.075 : positive[positive.length - 1] < 18 ? 0.4 : 4,
            step * 1.2,
          )
        : Math.min(near ? 0.075 : 2, step * (near ? 1.12 : 1.25));
      positive.push(positive[positive.length - 1] + step);
    }
    return new Float64Array([
      ...positive
        .slice(1)
        .reverse()
        .map((x) => -x),
      ...positive,
    ]);
  }
  const positive = Array.from(
    { length: 65 },
    (_, i) => (i * CONTACT_CORE) / 64,
  );
  let step = CONTACT_CORE / 64;
  while (positive[positive.length - 1] < 64) {
    step = Math.min(2, step * 1.18);
    positive.push(positive[positive.length - 1] + step);
  }
  return new Float64Array([
    ...positive
      .slice(1)
      .reverse()
      .map((x) => -x),
    ...positive,
  ]);
}
function gridCell(axis: Float64Array, value: number) {
  let lo = 0,
    hi = axis.length - 1;
  if (value < axis[lo] || value >= axis[hi]) return -1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (axis[mid] <= value) lo = mid;
    else hi = mid;
  }
  return lo;
}
const topologies = new Map<string, ContactTopology>();
export type ContactData = {
  bodyId: string;
  origin: number[];
  east: number[];
  north: number[];
  up: number[];
  extent: number;
  resolution: number;
  axis: Float64Array;
  coreOffsets?: Uint32Array;
  regions?: Int32Array;
  positions: Float32Array;
  colors: Float32Array;
  heights: Float32Array;
  indices: Uint32Array;
};
export type GroundSample = {
  point: Vector3;
  normal: Vector3;
  slope: number;
  water: boolean;
  vertex: number;
};
export function generateContact(
  body: Body,
  center: Vector3,
  layout: 'regions' | 'grid' = 'regions',
): ContactData {
  const up = localDirection(center, body).normalize(),
    east = new Vector3()
      .crossVectors(
        Math.abs(up.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0),
        up,
      )
      .normalize(),
    north = new Vector3().crossVectors(up, east);
  const origin = up.clone().multiplyScalar(surfaceRadius(up, body));
  const sourceAxis = contactAxis(
      body.id === 'p0-0' &&
        (body.terrainVersion ?? 1) >= 3 &&
        up.dot(COAST_UP) > 0.99998,
      (body.terrainVersion ?? 1) >= 4,
      body.terrainVersion === 5,
    ),
    topologyKey = `${sourceAxis.join(',')}:${body.terrainVersion === 5}`;
  const refineCoast =
    body.id === 'p0-0' &&
    body.terrainVersion === 5 &&
    up.dot(COAST_UP) > 0.9994;
  let topology =
    layout === 'regions' && !refineCoast
      ? topologies.get(topologyKey)
      : undefined;
  if (layout === 'regions' && !topology) {
    topology = contactTopology(
      sourceAxis,
      body.terrainVersion === 5,
      refineCoast ? coastalRefinement(body, origin, east, north) : undefined,
    );
    if (!refineCoast) topologies.set(topologyKey, topology);
  }
  const axis = topology?.axis.slice() ?? sourceAxis,
    extent = topology ? 76.8 : axis[axis.length - 1],
    resolution = axis.length - 1,
    points =
      topology?.points ??
      Array.from(axis).flatMap((y) => Array.from(axis, (x) => [x, y])),
    positions = new Float32Array(points.length * 3),
    colors = new Float32Array(positions.length),
    heights = new Float32Array(points.length),
    indices =
      topology?.indices.slice() ?? new Uint32Array(resolution * resolution * 6);
  let offset = 0;
  for (let id = 0; id < points.length; id++) {
    const [x, y] = points[id];
    const weights = topology?.weights.get(id);
    if (weights) {
      for (const [source, weight] of weights) {
        for (let k = 0; k < 3; k++) {
          positions[offset + k] += positions[source * 3 + k] * weight;
          colors[offset + k] += colors[source * 3 + k] * weight;
        }
        heights[id] += heights[source] * weight;
      }
      offset += 3;
      continue;
    }
    const base = origin
      .clone()
      .addScaledVector(east, x)
      .addScaledVector(north, y);
    let height = 0;
    // Solve a radial heightfield along the tangent patch's vertical axis.
    for (let k = 0; k < 5; k++) {
      const relative = base.clone().addScaledVector(up, height);
      height -= relative.length() - surfaceRadius(relative.normalize(), body);
    }
    const local = east
      .clone()
      .multiplyScalar(x)
      .addScaledVector(north, y)
      .addScaledVector(up, height);
    local.toArray(positions, offset);
    const direction = base.clone().addScaledVector(up, height).normalize();
    const h = elevation(direction, body);
    heights[offset / 3] = h;
    terrainColor(
      h / body.radius,
      body.kind,
      0.94 +
        0.06 *
          Math.sin(
            direction.x * body.radius * 2.1 + direction.z * body.radius * 1.7,
          ),
      sampleBiome(direction, body, h),
    ).toArray(colors, offset);
    offset += 3;
  }
  offset = 0;
  if (!topology)
    for (let row = 0; row < resolution; row++)
      for (let col = 0; col < resolution; col++) {
        const a = row * (resolution + 1) + col,
          b = a + 1,
          c = a + resolution + 1,
          d = c + 1;
        indices.set([a, b, d, a, d, c], offset);
        offset += 6;
      }
  return {
    bodyId: body.id,
    origin: origin.toArray(),
    east: east.toArray(),
    north: north.toArray(),
    up: up.toArray(),
    extent,
    resolution,
    axis,
    ...(topology
      ? {
          coreOffsets: topology.coreOffsets.slice(),
          regions: topology.regions.slice(),
        }
      : {}),
    positions,
    colors,
    heights,
    indices,
  };
}
export class ContactSurface {
  rotation = new Quaternion();
  origin: Vector3;
  east: Vector3;
  north: Vector3;
  up: Vector3;
  constructor(
    public data: ContactData,
    public body: Body,
  ) {
    this.origin = new Vector3().fromArray(data.origin);
    this.east = new Vector3().fromArray(data.east);
    this.north = new Vector3().fromArray(data.north);
    this.up = new Vector3().fromArray(data.up);
    this.syncRotation();
  }
  syncRotation() {
    this.rotation.copy(planetRotation(this.body));
    this.origin.copy(
      fromPlanet(new Vector3().fromArray(this.data.origin), this.body),
    );
    this.east.fromArray(this.data.east).applyQuaternion(this.rotation);
    this.north.fromArray(this.data.north).applyQuaternion(this.rotation);
    this.up.fromArray(this.data.up).applyQuaternion(this.rotation);
  }
  coordinates(world: Vector3) {
    const delta = world.clone().sub(this.origin);
    return { x: delta.dot(this.east), y: delta.dot(this.north) };
  }
  contains(world: Vector3, margin = 0.025) {
    const p = this.coordinates(world);
    return Math.hypot(p.x, p.y) < CONTACT_RADIUS - margin;
  }
  sample(world: Vector3): GroundSample | null {
    const { x, y } = this.coordinates(world),
      { axis, resolution, positions, indices, coreOffsets, regions } =
        this.data;
    if (Math.hypot(x, y) > CONTACT_RADIUS) return null;
    const ranges: [number, number][] = [];
    const lookup = (value: number) => {
      const lo = axis[0],
        hi = axis[axis.length - 1];
      if (value < lo - 0.00002 || value > hi + 0.00002) return -1;
      return gridCell(axis, Math.max(lo, Math.min(hi - 1e-10, value)));
    };
    const col = lookup(x),
      row = lookup(y);
    for (const [dx, dy] of [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const cx = col + dx,
        cy = row + dy;
      if (
        col < 0 ||
        row < 0 ||
        cx < 0 ||
        cy < 0 ||
        cx >= resolution ||
        cy >= resolution
      )
        continue;
      const cell = cy * resolution + cx;
      ranges.push(
        coreOffsets
          ? [coreOffsets[cell], coreOffsets[cell + 1]]
          : [cell * 6, cell * 6 + 6],
      );
    }
    if (
      regions &&
      (Math.abs(x) >= axis[axis.length - 1] - 0.00002 ||
        Math.abs(y) >= axis[axis.length - 1] - 0.00002)
    ) {
      const visited = new Set<number>();
      // Neighbor probes cover Float32 vertex rounding at exact region edges.
      for (const dx of [0, -0.00002, 0.00002])
        for (const dy of [0, -0.00002, 0.00002]) {
          let node = 0;
          while (regions[node + 3] >= 0) {
            const half = regions[node + 2] * 0.0375;
            node =
              (regions[node + 3] +
                (x + dx >= regions[node] * 0.075 + half ? 1 : 0) +
                (y + dy >= regions[node + 1] * 0.075 + half ? 2 : 0)) *
              6;
          }
          if (!visited.has(node) && regions[node + 5] > 0)
            ranges.push([
              regions[node + 4],
              regions[node + 4] + regions[node + 5],
            ]);
          visited.add(node);
        }
    }
    const inverse = this.rotation.clone().invert();
    const start = world
      .clone()
      .sub(this.origin)
      .applyQuaternion(inverse)
      .addScaledVector(new Vector3().fromArray(this.data.up), 100);
    const ray = new Ray(start, new Vector3().fromArray(this.data.up).negate());
    for (const [start, end] of ranges) {
      for (let triangle = start; triangle < end; triangle += 3) {
        const a = new Vector3().fromArray(positions, indices[triangle] * 3),
          b = new Vector3().fromArray(positions, indices[triangle + 1] * 3),
          c = new Vector3().fromArray(positions, indices[triangle + 2] * 3);
        const hit = ray.intersectTriangle(a, b, c, false, new Vector3());
        if (!hit) continue;
        const normal = b
            .sub(a)
            .cross(c.sub(a))
            .normalize()
            .applyQuaternion(this.rotation),
          point = hit.applyQuaternion(this.rotation).add(this.origin),
          direction = point.clone().sub(this.body.position).normalize();
        return {
          point,
          normal,
          vertex: indices[triangle],
          slope:
            (Math.acos(Math.max(-1, Math.min(1, normal.dot(direction)))) *
              180) /
            Math.PI,
          water:
            this.body.kind === 'ocean' &&
            elevation(toPlanet(point, this.body).normalize(), this.body) <
              0.002,
        };
      }
    }
    return null;
  }
}
