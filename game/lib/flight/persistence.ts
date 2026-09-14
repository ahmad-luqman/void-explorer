import { Quaternion, Vector3 } from 'three';
import type { FlightSimulation } from './simulation';
import type { SurfaceRecord } from './surface';
import { planetRotation, toPlanet } from './rotation';
import {
  relative,
  difference,
  translate,
  validAddress,
  type SpaceAddress,
} from './coordinates';
import { createUniverse, nearestSystem, surfaceRadius } from './universe';
export const EXPEDITION_KEY = 'void-expedition-v2';
export type ExpeditionSave = {
  version: 2 | 3 | 4;
  address?: SpaceAddress;
  rotationTime?: number;
  savedAt: number;
  position: number[];
  orientation: number[];
  target: string;
  visited: number[];
  surface: SurfaceRecord;
};
const vector = (v: unknown, n: number): v is number[] =>
  Array.isArray(v) &&
  v.length === n &&
  v.every(
    (x) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 1e9,
  );
const quaternion = (v: unknown): v is number[] =>
  vector(v, 4) && Math.abs(Math.hypot(...v) - 1) < 0.001;
const bodyId = (v: unknown) =>
  typeof v === 'string' &&
  (/^p\d{1,4}-[0-2]$/.test(v) || /^s\d{1,4}(-b)?$/.test(v));
export function captureExpedition(
  sim: FlightSimulation,
): ExpeditionSave | null {
  if (!['flight', 'landed', 'walking'].includes(sim.surface.phase)) return null;
  const surface = sim.surface.record();
  const body = sim.nearest;
  const attached = surface.phase !== 'flight';
  const inverse = planetRotation(body).invert();
  if (attached) {
    surface.shipPosition = toPlanet(sim.surface.shipPosition, body).toArray();
    surface.shipOrientation = inverse
      .clone()
      .multiply(sim.surface.shipOrientation)
      .toArray();
    surface.sceneryClearings = surface.sceneryClearings?.map((e) => ({
      ...e,
      point: toPlanet(new Vector3().fromArray(e.point), body).toArray(),
    }));
  }
  return {
    version: 4,
    address: sim.address,
    rotationTime: sim.rotationClock.time,
    savedAt: Date.now(),
    position: (attached
      ? toPlanet(sim.position, body)
      : new Vector3().fromArray(sim.address.offset)
    ).toArray(),
    orientation: (attached
      ? inverse.multiply(sim.orientation)
      : sim.orientation
    ).toArray(),
    target: sim.target.id,
    visited: [...sim.visited],
    surface,
  };
}
export function parseExpedition(raw: string | null): ExpeditionSave | null {
  try {
    const s = JSON.parse(raw || 'null');
    if (
      !s ||
      ![2, 3, 4].includes(s.version) ||
      (s.version >= 3 &&
        (!Number.isFinite(s.rotationTime) ||
          s.rotationTime < 0 ||
          s.rotationTime > 1e9)) ||
      (s.version === 4 && !validAddress(s.address)) ||
      !Number.isFinite(s.savedAt) ||
      !vector(s.position, 3) ||
      !quaternion(s.orientation) ||
      !bodyId(s.target) ||
      !Array.isArray(s.visited) ||
      s.visited.length > 1024 ||
      !s.visited.every(
        (i: unknown) =>
          Number.isInteger(i) && Number(i) >= 0 && Number(i) < 1024,
      )
    )
      return null;
    const f = s.surface;
    if (
      !f ||
      !['flight', 'landed', 'walking'].includes(f.phase) ||
      !(f.bodyId === null || bodyId(f.bodyId)) ||
      !vector(f.shipPosition, 3) ||
      !quaternion(f.shipOrientation) ||
      !Number.isFinite(f.walked) ||
      f.walked < 0
    )
      return null;
    if (f.sceneryVersion !== undefined && f.sceneryVersion !== 1) return null;
    if (
      f.sceneryClearings !== undefined &&
      (!Array.isArray(f.sceneryClearings) ||
        f.sceneryClearings.length > 2 ||
        !f.sceneryClearings.every(
          (e: { point?: unknown; radius?: unknown }) =>
            e &&
            vector(e.point, 3) &&
            typeof e.radius === 'number' &&
            Number.isFinite(e.radius) &&
            e.radius >= 0 &&
            e.radius <= 0.05,
        ))
    )
      return null;
    return s as ExpeditionSave;
  } catch {
    return null;
  }
}
export function restoreExpedition(
  sim: FlightSimulation,
  save: ExpeditionSave,
): boolean {
  // Validate the entire record before changing any live state.
  const valid = parseExpedition(JSON.stringify(save));
  if (!valid) return false;
  const bodies = sim.systems.flatMap((s) => [
      s.star,
      ...s.planets,
      ...(s.companion ? [s.companion] : []),
    ]),
    target = bodies.find((b) => b.id === save.target);
  if (!target) return false;
  const body = bodies.find((b) => b.id === save.surface.bodyId);
  const time = save.version >= 3 ? save.rotationTime! : 0;
  const record = structuredClone(save.surface);
  const orientation = new Quaternion().fromArray(save.orientation);
  let location: SpaceAddress;
  if (record.phase !== 'flight') {
    if (!body || body.star || !body.address) return false;
    const legacyBody =
      save.version === 2
        ? createUniverse(1)
            .flatMap((s) => s.planets)
            .find((b) => b.id === body.id)!
        : null;
    const native = (coords: number[]) =>
      legacyBody
        ? new Vector3().fromArray(coords).sub(legacyBody.position)
        : new Vector3().fromArray(coords);
    const pilot = native(save.position),
      ship = native(record.shipPosition);
    for (const point of [pilot, ship]) {
      const distance = point.length();
      if (
        distance < 1 ||
        Math.abs(distance - surfaceRadius(point.clone().normalize(), body)) >
          0.06
      )
        return false;
    }
    const rotation = planetRotation(body, time);
    location = translate(body.address, pilot.applyQuaternion(rotation));
    if (
      save.version === 4 &&
      difference(location, save.address!).length() > 1e-6
    )
      return false;
    record.shipPosition = relative(
      translate(body.address, ship.applyQuaternion(rotation)),
      location.cells,
    ).toArray();
    record.shipOrientation = rotation
      .clone()
      .multiply(new Quaternion().fromArray(record.shipOrientation))
      .toArray();
    record.sceneryClearings = record.sceneryClearings?.map((e) => ({
      ...e,
      point: relative(
        translate(body.address!, native(e.point).applyQuaternion(rotation)),
        location.cells,
      ).toArray(),
    }));
    orientation.premultiply(rotation);
  } else {
    if (save.version === 4) location = save.address!;
    else {
      // Keep old flights at their local address within the nearest legacy system.
      const oldPosition = new Vector3().fromArray(save.position);
      const oldSystem = nearestSystem(oldPosition, createUniverse(1));
      location = translate(
        sim.systems[oldSystem.id].address!,
        oldPosition.sub(oldSystem.position),
      );
    }
    record.bodyId = null;
    record.shipPosition = [0, 0, 0];
    record.shipOrientation = [0, 0, 0, 1];
    record.sceneryClearings = [];
  }
  if (!validAddress(location)) return false;
  sim.reset();
  sim.setAddress(location);
  sim.rotationClock.time = time;
  sim.elapsed = time;
  sim.orientation.copy(orientation);
  sim.target = target;
  sim.visited = new Set(save.visited);
  sim.updateEnvironment();
  sim.surface.restore(record, sim.altitude < 60 && !sim.nearest.star);
  return true;
}
