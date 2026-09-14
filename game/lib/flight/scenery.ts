import { Vector3 } from 'three';
import type { ContactSurface } from './contact';
import { toPlanet, fromPlanet } from './rotation';
import { random, surfaceRadius } from './universe';

export const SCENERY_RANGE = 0.8;
export const SCENERY_LIMIT = 700;
const CELL = 0.065;
export type SurfaceProp = {
  id: string;
  point: Vector3;
  normal: Vector3;
  radius: number;
  height: number;
  yaw: number;
  mineral: boolean;
};

// Cells live on the six fixed cube faces of a planet, never on a moving patch.
// Candidate identity and dimensions therefore survive walking, recentering and reload.
export function generateScenery(
  patch: ContactSurface,
  focus: Vector3,
): SurfaceProp[] {
  const body = patch.body,
    radial = toPlanet(focus, body).normalize();
  const center = fromPlanet(
    radial.clone().multiplyScalar(surfaceRadius(radial, body)),
    body,
  );
  const props: SurfaceProp[] = [];
  for (let axis = 0; axis < 3; axis++) {
    const a = (axis + 1) % 3,
      b = (axis + 2) % 3;
    const dominant = radial.getComponent(axis),
      sign = Math.sign(dominant);
    if (Math.abs(dominant) < 0.54) continue;
    const face = axis * 2 + (sign > 0 ? 1 : 0);
    const cx = Math.floor(
      ((radial.getComponent(a) / Math.abs(dominant)) * body.radius) / CELL,
    );
    const cy = Math.floor(
      ((radial.getComponent(b) / Math.abs(dominant)) * body.radius) / CELL,
    );
    const span = Math.ceil(SCENERY_RANGE / (CELL * dominant * dominant));
    for (let x = cx - span; x <= cx + span; x++)
      for (let y = cy - span; y <= cy + span; y++) {
        const rng = random(
          body.seed ^
            Math.imul(x, 73856093) ^
            Math.imul(y, 19349663) ^
            Math.imul(face + 1, 83492791),
        );
        if (rng() > 0.46) continue;
        const u = (x + 0.15 + rng() * 0.7) * CELL,
          v = (y + 0.15 + rng() * 0.7) * CELL;
        if (Math.abs(u) >= body.radius || Math.abs(v) >= body.radius) continue;
        // Recurring clearings leave room for a ship and safe surface exits.
        const clearing = (n: number) => n - Math.round(n / 0.26) * 0.26;
        if (Math.hypot(clearing(u), clearing(v)) < 0.045) continue;
        const direction = new Vector3()
          .setComponent(axis, sign * body.radius)
          .setComponent(a, u)
          .setComponent(b, v)
          .normalize();
        const candidate = fromPlanet(
          direction.clone().multiplyScalar(surfaceRadius(direction, body)),
          body,
        );
        if (candidate.distanceTo(center) > SCENERY_RANGE) continue;
        const ground = patch.sample(candidate);
        if (!ground || ground.water || ground.slope > 28) continue;
        const radius = 0.0008 + rng() ** 2 * 0.0026;
        const mineral = rng() > (body.kind === 'ice' ? 0.35 : 0.76);
        props.push({
          id: `${body.id}:${face}:${x}:${y}`,
          point: ground.point,
          normal: ground.normal,
          radius,
          height: radius * (mineral ? 2.8 : 0.65 + rng() * 0.8),
          yaw: rng() * Math.PI * 2,
          mineral,
        });
      }
  }
  // A fixed budget, sorted by distance, retains the nearby collision obstacles.
  return props
    .sort(
      (a, b) =>
        a.point.distanceToSquared(center) - b.point.distanceToSquared(center),
    )
    .slice(0, SCENERY_LIMIT);
}

export function sceneryBlocks(
  props: SurfaceProp[],
  point: Vector3,
  up: Vector3,
  clearance: number,
) {
  return props.some((prop) => {
    const delta = point.clone().sub(prop.point);
    delta.addScaledVector(up, -delta.dot(up));
    const tilt = Math.sqrt(Math.max(0, 1 - prop.normal.dot(up) ** 2));
    return (
      delta.lengthSq() < (prop.radius + prop.height * 2 * tilt + clearance) ** 2
    );
  });
}
