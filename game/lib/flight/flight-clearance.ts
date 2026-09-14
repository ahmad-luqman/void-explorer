import { Vector3 } from 'three';
import { CONTACT_CORE, type ContactSurface } from './contact';
import type { SurfaceProp } from './scenery';
import { type Body, worldSurfaceRadius } from './universe';

// A rotation-independent envelope encloses AURORA's 28.8 m wingspan and tail.
// Two extra meters absorb substep/triangle-edge error. Landing has its own gear checks.
export const FLIGHT_RADIUS = 0.018;
export const FLIGHT_BUFFER = 0.002;
export const UNMAPPED_CLEARANCE = 5;
export type FlightClearance = { distance: number; reason: string };
const probes = Array.from({ length: 8 }, (_, i) => ({
  x: Math.cos((i * Math.PI) / 4) * FLIGHT_RADIUS,
  y: Math.sin((i * Math.PI) / 4) * FLIGHT_RADIUS,
}));

export function flightClearance(
  position: Vector3,
  body: Body,
  patch: ContactSurface | null,
  scenery: SurfaceProp[],
): FlightClearance {
  const radial = position.clone().sub(body.position);
  const altitude =
    radial.length() - worldSurfaceRadius(radial.normalize(), body);
  if (body.star)
    return {
      distance: altitude - 180,
      reason: 'Stellar proximity — engines stopped.',
    };
  const groundPatch = patch?.body.id === body.id ? patch : null;
  const coordinates = groundPatch?.coordinates(position);
  const mapped =
    coordinates &&
    groundPatch!.up.dot(radial) > 0.99 &&
    Math.max(Math.abs(coordinates.x), Math.abs(coordinates.y)) <
      CONTACT_CORE - 0.04;
  if (!mapped || !groundPatch)
    return {
      distance: altitude - UNMAPPED_CLEARANCE,
      reason:
        'Terrain ahead is still being mapped — turn or wait before accelerating.',
    };
  if (altitude > 2)
    return {
      distance: altitude - FLIGHT_RADIUS - FLIGHT_BUFFER,
      reason: 'Ground clearance — engines stopped.',
    };

  let distance = Infinity;
  // Sample the rendered footprint as well as its center. This conservatively
  // protects banked wings and the nose across adjacent triangles and ridgelines.
  for (const probe of [{ x: 0, y: 0 }, ...probes]) {
    const at = position
      .clone()
      .addScaledVector(groundPatch.east, probe.x)
      .addScaledVector(groundPatch.north, probe.y);
    const ground = groundPatch.sample(at);
    if (!ground)
      return { distance: -1, reason: 'Waiting for terrain — engines stopped.' };
    distance = Math.min(
      distance,
      at.sub(ground.point).dot(ground.normal) - FLIGHT_RADIUS - FLIGHT_BUFFER,
    );
  }
  let reason =
    'Ground clearance — engines stopped. Pitch up or choose a clear landing site.';
  for (const prop of scenery) {
    // A capsule encloses all rendered shapes, including tilted minerals and
    // the translated icosahedron. Unlike walking footprints, this permits overflight.
    const relative = position.clone().sub(prop.point);
    const along = Math.max(
      -0.3 * prop.height,
      Math.min(1.8 * prop.height, relative.dot(prop.normal)),
    );
    const separation =
      relative.addScaledVector(prop.normal, -along).length() -
      prop.radius -
      FLIGHT_RADIUS -
      FLIGHT_BUFFER;
    if (separation < distance) {
      distance = separation;
      reason =
        'Obstacle clearance — engines stopped. Climb or steer around the obstacle.';
    }
  }
  return { distance, reason };
}
