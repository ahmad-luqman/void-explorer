import { Vector3 } from 'three';
import type { FlightSimulation } from './simulation';
import { worldSurfaceRadius } from './universe';
export function navigationReadout(sim: FlightSimulation) {
  const delta = sim.target.position.clone().sub(sim.position),
    distance = delta.length();
  const radial = delta.clone().negate().normalize();
  const radius = sim.target.star
    ? sim.target.radius
    : worldSurfaceRadius(radial, sim.target);
  const range = Math.max(0, distance - radius);
  const stop = sim.target.star
    ? sim.target.radius * 2.8
    : radius + (sim.descending ? 12 : Math.max(180, sim.target.radius * 0.65));
  const remaining = Math.max(0, distance - stop);
  const alignment = new Vector3(0, 0, -1)
    .applyQuaternion(sim.orientation)
    .dot(delta.normalize());
  const closingSpeed = sim.speed * alignment;
  let guidance = 'Ready to navigate';
  if (sim.surface.phase !== 'flight')
    guidance =
      sim.surface.phase === 'walking'
        ? 'Return to ship to fly'
        : 'Surface operations';
  else if (sim.autopilot)
    guidance =
      alignment < 0.85
        ? 'Aligning course'
        : remaining < 500
          ? 'Final approach'
          : sim.descending
            ? 'Atmospheric descent'
            : 'En route';
  else if (remaining < 2 && sim.speed < 1) guidance = 'At destination';
  else if (sim.speed > 0.1)
    guidance =
      closingSpeed < -0.01
        ? 'Moving away from target'
        : alignment < 0.15
          ? 'Target off course'
          : 'Manual approach';
  // An instantaneous estimate, shown only when actually closing on the target.
  const eta =
    sim.surface.phase === 'flight' && closingSpeed > 0.1 && remaining > 0
      ? remaining / closingSpeed
      : null;
  return { range, remaining, closingSpeed, alignment, guidance, eta };
}
export function etaLabel(seconds: number | null) {
  if (seconds === null) return '—';
  if (seconds < 60) return `${Math.ceil(seconds)} s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1)} h`;
}
