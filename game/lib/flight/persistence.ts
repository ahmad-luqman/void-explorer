import { Quaternion, Vector3 } from 'three';
import type { FlightSimulation } from './simulation';
import type { SurfaceRecord } from './surface';
import { surfaceRadius } from './universe';
export const EXPEDITION_KEY = 'void-expedition-v2';
export type ExpeditionSave = {
  version: 2;
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
  return {
    version: 2,
    savedAt: Date.now(),
    position: sim.position.toArray(),
    orientation: sim.orientation.toArray(),
    target: sim.target.id,
    visited: [...sim.visited],
    surface: sim.surface.record(),
  };
}
export function parseExpedition(raw: string | null): ExpeditionSave | null {
  try {
    const s = JSON.parse(raw || 'null');
    if (
      !s ||
      s.version !== 2 ||
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
  const body = bodies.find((b) => b.id === save.surface.bodyId),
    position = new Vector3().fromArray(save.position);
  if (save.surface.phase !== 'flight') {
    if (!body || body.star) return false;
    for (const coords of [save.position, save.surface.shipPosition]) {
      const delta = new Vector3().fromArray(coords).sub(body.position),
        distance = delta.length();
      if (
        distance < 1 ||
        Math.abs(distance - surfaceRadius(delta.normalize(), body)) > 0.06
      )
        return false;
    }
  }
  sim.reset();
  sim.position.copy(position);
  sim.orientation.copy(new Quaternion().fromArray(save.orientation));
  sim.target = target;
  sim.visited = new Set(save.visited);
  sim.updateEnvironment();
  sim.surface.restore(save.surface, sim.altitude < 60 && !sim.nearest.star);
  return true;
}
