import { Line3, Ray, Vector3 } from 'three';
import type { ContactSurface } from './contact';
import { sampleBiome } from './biomes';
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
  shape?: 'fan' | 'succulent' | 'landmark';
  tint?: string;
  landmark?: string;
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
  const additions = generateExplorationScenery(patch, focus);
  const landmarks = additions.filter((p) => p.shape === 'landmark');
  props.push(...additions.filter((p) => p.shape !== 'landmark'));
  // Reserve landmark coverage; retain nearby small obstacles within the total cap.
  return landmarks.concat(
    props
      .sort(
        (a, b) =>
          a.point.distanceToSquared(center) - b.point.distanceToSquared(center),
      )
      .slice(0, SCENERY_LIMIT - landmarks.length),
  );
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

// Independent seed streams preserve the existing rocks while adding new layers.
function generateExplorationScenery(
  patch: ContactSurface,
  focus: Vector3,
): SurfaceProp[] {
  const body = patch.body,
    radial = toPlanet(focus, body).normalize();
  const result: SurfaceProp[] = [];
  for (const layer of ['plant', 'landmark'] as const) {
    const cell = layer === 'plant' ? 0.055 : 0.65;
    const range = layer === 'plant' ? SCENERY_RANGE : 1.4;
    for (let axis = 0; axis < 3; axis++) {
      const a = (axis + 1) % 3,
        b = (axis + 2) % 3;
      const dominant = radial.getComponent(axis),
        sign = Math.sign(dominant);
      if (Math.abs(dominant) < 0.54) continue;
      const face = axis * 2 + (sign > 0 ? 1 : 0);
      const cx = Math.floor(
        ((radial.getComponent(a) / Math.abs(dominant)) * body.radius) / cell,
      );
      const cy = Math.floor(
        ((radial.getComponent(b) / Math.abs(dominant)) * body.radius) / cell,
      );
      const span = Math.ceil(range / (cell * dominant * dominant)) + 2;
      for (let x = cx - span; x <= cx + span; x++)
        for (let y = cy - span; y <= cy + span; y++) {
          const rng = random(
            body.seed ^
              Math.imul(x, 73856093) ^
              Math.imul(y, 19349663) ^
              Math.imul(face + 1, 83492791) ^
              (layer === 'plant' ? 19891 : 91273),
          );
          const chance = rng(),
            u = (x + 0.2 + rng() * 0.6) * cell,
            v = (y + 0.2 + rng() * 0.6) * cell;
          if (Math.abs(u) >= body.radius || Math.abs(v) >= body.radius)
            continue;
          const direction = new Vector3()
            .setComponent(axis, sign * body.radius)
            .setComponent(a, u)
            .setComponent(b, v)
            .normalize();
          const biome = sampleBiome(direction, body);
          if (
            layer === 'plant' &&
            (!biome.vegetation || chance > biome.density)
          )
            continue;
          if (layer === 'landmark' && chance > 0.3) continue;
          const clearing = (n: number) => n - Math.round(n / 0.26) * 0.26;
          if (
            Math.hypot(clearing(u), clearing(v)) <
            (layer === 'plant' ? 0.05 : 0.07)
          )
            continue;
          const candidate = fromPlanet(
            direction.multiplyScalar(surfaceRadius(direction, body)),
            body,
          );
          const lateral = candidate.clone().sub(focus);
          lateral.addScaledVector(patch.up, -lateral.dot(patch.up));
          if (lateral.length() > range) continue;
          const ground = patch.sample(candidate);
          if (
            !ground ||
            ground.water ||
            ground.slope > (layer === 'plant' ? 24 : 18)
          )
            continue;
          const landmark = layer === 'landmark';
          const radius = landmark
            ? 0.008 + rng() * 0.008
            : biome.vegetation === 'fan'
              ? 0.0018 + rng() * 0.0018
              : 0.001 + rng() * 0.0012;
          const height = landmark
            ? 0.022 + rng() * 0.022
            : biome.vegetation === 'fan'
              ? 0.004 + rng() * 0.004
              : 0.0015 + rng() * 0.002;
          result.push({
            id: `${body.id}:${layer}:${face}:${x}:${y}`,
            point: ground.point,
            normal: ground.normal,
            radius,
            height,
            yaw: rng() * Math.PI * 2,
            mineral: false,
            shape: landmark ? 'landmark' : biome.vegetation!,
            tint: landmark
              ? { ocean: '#71638e', desert: '#805168', ice: '#88cfdd' }[
                  body.kind
                ]
              : biome.vegetation === 'fan'
                ? '#477f86'
                : '#985c86',
            landmark: landmark
              ? {
                  ocean: 'Tide Sentinels',
                  desert: 'Cinder Crown',
                  ice: 'Frost Needles',
                }[body.kind]
              : undefined,
          });
        }
    }
  }
  // Sparse large forms cannot crowd out the close-range collision field.
  const landmarks = result
    .filter((p) => p.shape === 'landmark')
    .sort(
      (a, b) =>
        a.point.distanceToSquared(focus) - b.point.distanceToSquared(focus),
    )
    .slice(0, 24);
  return [...landmarks, ...result.filter((p) => p.shape !== 'landmark')];
}

// Test the complete final approach against the same conservative prop capsules.
export function sceneryApproachBlocked(
  props: SurfaceProp[],
  from: Vector3,
  to: Vector3,
  radius = 0.02,
) {
  const direction = to.clone().sub(from),
    length = direction.length();
  if (length < 1e-9) return false;
  const ray = new Ray(from, direction.divideScalar(length));
  return props.some((prop) => {
    const a = prop.point
      .clone()
      .addScaledVector(prop.normal, -0.3 * prop.height);
    const b = prop.point
      .clone()
      .addScaledVector(prop.normal, 1.8 * prop.height);
    const onRay = new Vector3();
    let distance = ray.distanceSqToSegment(a, b, onRay, new Vector3());
    if (onRay.distanceToSquared(from) > length * length)
      distance = new Line3(a, b)
        .closestPointToPoint(to, true, new Vector3())
        .distanceToSquared(to);
    return distance < (prop.radius + radius) ** 2;
  });
}
