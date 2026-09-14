import { Vector3 } from 'three';
import type { ContactSurface } from './contact';
import type { Body } from './universe';

// Predict a bounded distance ahead, retaining dense ground under the observer
// even when the ship turns or the worker needs several frames to finish.
export function contactRequest(
  body: Body,
  position: Vector3,
  velocity: Vector3,
  patch: ContactSurface | null,
) {
  const up = position.clone().sub(body.position).normalize();
  const lead = velocity
    .clone()
    .addScaledVector(up, -velocity.dot(up))
    .multiplyScalar(0.35)
    .clampLength(0, 0.35);
  const focus = position.clone().add(lead);
  if (patch?.body.id === body.id && patch.up.dot(up) > 0.99) {
    const now = patch.coordinates(position),
      ahead = patch.coordinates(focus);
    if (Math.hypot(now.x, now.y) < 0.55 && Math.hypot(ahead.x, ahead.y) < 0.8)
      return null;
  }
  return focus.sub(body.position).normalize();
}
export function terrainRefresh(
  observer: Vector3,
  previous: Vector3 | undefined,
  radius: number,
  qualityChanged: boolean,
) {
  if (!previous || qualityChanged) return true;
  const altitude = Math.max(1, observer.length() - radius);
  const priorAltitude = Math.max(1, previous.length() - radius);
  // Separate approach/retreat thresholds avoid rebuilding at a single altitude boundary.
  if (altitude < priorAltitude * 0.65 || altitude > priorAltitude * 1.65)
    return true;
  const angle = Math.max(0.005, Math.min(0.06, (altitude / radius) * 0.2));
  return observer.angleTo(previous) > angle;
}
