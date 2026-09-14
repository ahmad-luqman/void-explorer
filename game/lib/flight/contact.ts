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
export function contactAxis() {
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
export type ContactData = {
  bodyId: string;
  origin: number[];
  east: number[];
  north: number[];
  up: number[];
  extent: number;
  resolution: number;
  axis: Float64Array;
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
};
export type GroundSample = {
  point: Vector3;
  normal: Vector3;
  slope: number;
  water: boolean;
};
export function generateContact(body: Body, center: Vector3): ContactData {
  const up = localDirection(center, body).normalize(),
    east = new Vector3()
      .crossVectors(
        Math.abs(up.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0),
        up,
      )
      .normalize(),
    north = new Vector3().crossVectors(up, east);
  const origin = body.position
    .clone()
    .addScaledVector(up, surfaceRadius(up, body));
  const axis = contactAxis(),
    extent = axis[axis.length - 1],
    resolution = axis.length - 1,
    positions = new Float32Array((resolution + 1) ** 2 * 3),
    colors = new Float32Array(positions.length),
    indices = new Uint32Array(resolution * resolution * 6);
  let offset = 0;
  for (let row = 0; row <= resolution; row++)
    for (let col = 0; col <= resolution; col++) {
      const x = axis[col],
        y = axis[row];
      const base = origin
        .clone()
        .addScaledVector(east, x)
        .addScaledVector(north, y);
      let height = 0;
      // Solve a radial heightfield along the tangent patch's vertical axis.
      for (let k = 0; k < 5; k++) {
        const relative = base
          .clone()
          .addScaledVector(up, height)
          .sub(body.position);
        height -= relative.length() - surfaceRadius(relative.normalize(), body);
      }
      const local = east
        .clone()
        .multiplyScalar(x)
        .addScaledVector(north, y)
        .addScaledVector(up, height);
      local.toArray(positions, offset);
      const direction = base
        .clone()
        .addScaledVector(up, height)
        .sub(body.position)
        .normalize();
      const h = elevation(direction, body);
      terrainColor(
        h / body.radius,
        body.kind,
        0.94 +
          0.06 *
            Math.sin(
              direction.x * body.radius * 2.1 + direction.z * body.radius * 1.7,
            ),
      ).toArray(colors, offset);
      offset += 3;
    }
  offset = 0;
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
    positions,
    colors,
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
      fromPlanet(
        new Vector3().fromArray(this.data.origin).sub(this.body.position),
        this.body,
      ),
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
      { axis, resolution, positions, indices } = this.data;
    const col = gridCell(axis, x),
      row = gridCell(axis, y);
    if (
      Math.hypot(x, y) > CONTACT_RADIUS ||
      col < 0 ||
      row < 0 ||
      col >= resolution ||
      row >= resolution
    )
      return null;

    const inverse = this.rotation.clone().invert();
    const start = world
      .clone()
      .sub(this.origin)
      .applyQuaternion(inverse)
      .addScaledVector(new Vector3().fromArray(this.data.up), 100);
    const ray = new Ray(start, new Vector3().fromArray(this.data.up).negate());
    // Float32 vertices can cross their analytic grid boundary by a few ulps.
    // Check adjacent cells as well so an exact edge never becomes a contact hole.
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
      if (cx < 0 || cy < 0 || cx >= resolution || cy >= resolution) continue;
      const cell = (cy * resolution + cx) * 6;
      for (let triangle = 0; triangle < 2; triangle++) {
        const a = new Vector3().fromArray(
            positions,
            indices[cell + triangle * 3] * 3,
          ),
          b = new Vector3().fromArray(
            positions,
            indices[cell + triangle * 3 + 1] * 3,
          ),
          c = new Vector3().fromArray(
            positions,
            indices[cell + triangle * 3 + 2] * 3,
          );
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
