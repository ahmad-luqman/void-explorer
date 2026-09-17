import { Vector3 } from 'three';

// Native planet coordinates: this region rotates, streams and collides like the
// rest of Aurelia. Distances and heights below are kilometers.
export const COAST_UP = new Vector3(
  0.4578271005130527,
  0.8452666666666666,
  0.2755333160582099,
).normalize();
// Ocean-facing at the expedition's late-afternoon rotation phase.
export const COAST_FORWARD = new Vector3(
  0.5846376258372692,
  -0.05276144033028834,
  -0.8095770975451532,
).normalize();
export const COAST_TIME = 2250;
export const COAST_RIGHT = new Vector3()
  .crossVectors(COAST_FORWARD, COAST_UP)
  .normalize();
export function coastDirection(x: number, z: number, radius = 1000) {
  return COAST_UP.clone()
    .multiplyScalar(radius)
    .addScaledVector(COAST_RIGHT, x)
    .addScaledVector(COAST_FORWARD, z)
    .normalize();
}
export function coastCoordinates(d: Vector3, radius: number) {
  return { x: d.dot(COAST_RIGHT) * radius, z: d.dot(COAST_FORWARD) * radius };
}
const smooth = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// Broken radial ridges produce angular peaks, rather than stacked cylinders.
const peaks = [
  [-0.32, 0.52, 0.22, 0.2],
  [0.45, 0.65, 0.28, 0.27],
  [-0.8, 1.0, 0.35, 0.3],
  [0.9, 1.1, 0.24, 0.24],
  [0.16, 1.4, 0.35, 0.22],
  [-1.1, 1.7, 0.45, 0.4],
  [-3.6, 2.4, 1.1, 0.58],
  [-1.8, 3.5, 0.9, 0.3],
  [1.25, 1.5, 0.65, 0.34],
  [1.7, 1.8, 0.55, 0.65],
  [4.4, 4.2, 1.5, 0.7],
  [-6, 7, 2.4, 1.15],
  [7, 9, 3.2, 1.6],
  [-7, -2.8, 3.2, 1.35],
  [-3.5, -3.3, 2.7, 1.6],
  [1, -4.8, 3.1, 2.2],
  [5.5, -3.1, 2.5, 1.6],
  [10, -1.8, 3.6, 2.4],
  [-13, 3, 4, 2.5],
  [-11, -7, 4.6, 3.4],
  [5, -10, 5, 3.8],
];
export function coastalElevation(
  d: Vector3,
  radius: number,
  original: number,
  detailed = false,
) {
  // Cheap angular reject for the rest of the planet (including the antipode).
  if (d.dot(COAST_UP) < 0.9994) return original;
  const { x, z } = coastCoordinates(d, radius);
  const distance = Math.hypot(x, z);
  if (distance >= 30) return original;
  const coast = 0.085 + 0.18 * smooth(0.04, 0.3, x) - 0.025 * Math.cos(x * 8.1);
  const inland = 1 - smooth(coast - 0.025, coast + 0.055, z);
  let h = -0.13 + inland * (0.19 + Math.max(0, -z - 0.3) * 0.075);
  for (const [px, pz, width, height] of peaks) {
    const dx = (x - px) / width,
      dz = (z - pz) / width;
    const angle = Math.atan2(dz, dx);
    const broken =
      1 + 0.17 * Math.sin(angle * 5 + px) + 0.1 * Math.cos(angle * 9);
    if (detailed) {
      // Cross-cut ridges and side summits break the single-cone island shape.
      const warp = Math.min(1, Math.hypot(dx, dz) * 3);
      const warpX = dx + Math.sin(dz * 5.4 + px) * 0.12 * warp;
      const warpZ = dz + Math.sin(dx * 4.7 + pz) * 0.1 * warp;
      const ridge = Math.max(
        0,
        1 - Math.hypot(warpX * 0.82, warpZ * 1.16) * broken,
      );
      const flank = Math.max(
        0,
        1 - Math.hypot((dx - 0.37) * 1.65, (dz + 0.18) * 2.1),
      );
      const cut = 0.8 + 0.2 * Math.abs(Math.sin(dx * 15 + dz * 8 + px));
      h += height * (ridge ** 1.12 * cut + flank ** 1.5 * 0.23);
    } else {
      h += height * Math.max(0, 1 - Math.hypot(dx, dz) * broken) ** 1.5;
    }
  }
  if (detailed && h > 0) {
    const outside = smooth(0.16, 0.3, distance);
    const beds =
      Math.sin(h * 190 + x * 2 - z * 3) * 0.003 +
      Math.sin(x * 39 + z * 21) * Math.sin(z * 43 - x * 13) * 0.004;
    h += beds * outside;
  }
  // Centimeter-to-meter shader detail rests on real meter-scale rocky relief.
  const relief =
    Math.sin(x * 67 + Math.sin(z * 31)) * Math.cos(z * 49) * 0.0015 +
    Math.sin(x * 19 + z * 27) * 0.0025 +
    Math.sin(x * 8 - z * 11) * 0.006;
  h += relief * smooth(0.055, 0.11, distance) * inland;
  // A 110 m clearing makes the initial ship approach and disembarkation safe.
  const pad = 1 - smooth(0.055, 0.12, distance);
  h = h * (1 - pad) + 0.062 * pad;
  const blend = 1 - smooth(18, 30, distance);
  return original * (1 - blend) + h * blend;
}

// Profile 4: an open water corridor between staggered island groups, with
// successively taller inland/background ridges. Legacy profiles above stay exact.
const vistaPeaks = [
  [-0.42, 0.65, 0.28, 0.21],
  [-0.87, 1.24, 0.57, 0.42],
  [-1.8, 2.1, 0.75, 0.52],
  [-3.6, 3.8, 1.1, 0.85],
  [1.04, 1.58, 0.55, 0.2],
  [1.42, 1.94, 0.38, 0.19],
  [2.8, 3.1, 0.8, 0.49],
  [4.8, 4.1, 1.4, 0.86],
  [-0.3, 4.3, 0.7, 0.32],
  [1.0, 5.8, 0.55, 0.33],
  [-5.8, 7, 2.0, 1.1],
  [-3.2, 9.1, 1.9, 1.15],
  [0.0, 11, 2.0, 1.05],
  [3.3, 11.5, 2.2, 1.55],
  [7.2, 10.8, 2.3, 1.8],
  [10.2, 12.5, 3.0, 2.0],
  [-8.0, 14.0, 3.0, 2.3],
  [-3.9, 15.4, 2.7, 2.15],
  [1.1, 17.0, 3.0, 2.5],
  [5.8, 16.6, 2.6, 2.8],
  [-7, -2.8, 3.2, 1.35],
  [-3.5, -3.3, 2.7, 1.6],
  [1, -4.8, 3.1, 2.2],
  [5.5, -3.1, 2.5, 1.6],
  [10, -1.8, 3.6, 2.4],
  [-13, 3, 4, 2.5],
];
export function coastalVistaElevation(
  d: Vector3,
  radius: number,
  original: number,
  cliffs = false,
) {
  if (d.dot(COAST_UP) < (cliffs ? 0.97 : 0.99)) return original;
  const { x, z } = coastCoordinates(d, radius);
  const distance = Math.hypot(x, z);
  if (distance >= (cliffs ? 180 : 100)) return original;
  // Preserve the landing footprint; low exposed shelves outside it add real relief.
  // Outside this blend the legacy field's coefficient is exactly zero. Avoid
  // evaluating all of its peaks for every outer vertex and scenery query.
  const legacy =
    distance < 0.24 ? coastalElevation(d, radius, original, true) : 0;
  // Surround the vista with a low regional coast. The original planet has
  // tens-of-kilometers relief that otherwise becomes a triangular wall behind it.
  if (distance > 30) {
    const regional =
      -0.1 +
      Math.max(0, -z) * 0.02 +
      Math.max(0, Math.sin(x * 0.7) * Math.cos(z * 0.6)) * 0.8;
    // Move the transition to the planet's much taller original terrain beyond
    // the coastal horizon, so it cannot become a single giant background wall.
    const blend = smooth(cliffs ? 80 : 40, cliffs ? 180 : 100, distance);
    return regional * (1 - blend) + original * blend;
  }
  const laneDistance = Math.min(
    Math.abs(x - 0.027 - z * 0.65),
    Math.abs(x + 0.027 - z * 0.65),
  );
  const reliefMask =
    smooth(0.039, 0.05, distance) *
    (1 - smooth(0.14, 0.22, distance)) *
    (z > -0.01 && z < 0.105 ? smooth(0.003, 0.009, laneDistance) : 1);
  const foregroundRelief =
    reliefMask *
    (0.0014 * Math.sin(x * 123 + z * 47) * Math.sin(z * 103 - x * 31) +
      0.0006 * Math.cos(x * 221 - z * 149));
  if (distance <= 0.12) return legacy + foregroundRelief;
  const coast = 0.06 + 0.075 * Math.sin(x * 5.3) + 0.028 * Math.cos(x * 13.0);
  const inland = 1 - smooth(coast - 0.025, coast + 0.11, z);
  let h = -0.09 + inland * (0.15 + Math.max(0, -z - 0.3) * 0.075);
  for (const [px, pz, width, height] of vistaPeaks) {
    const dx = (x - px) / width,
      dz = (z - pz) / width;
    if (Math.abs(dx) > 1.7 || Math.abs(dz) > 1.7) continue;
    const angle = Math.atan2(dz, dx);
    const warp = Math.min(1, Math.hypot(dx, dz) * 3);
    const wx = dx + Math.sin(dz * 6 + px) * 0.14 * warp;
    const wz = dz + Math.sin(dx * 7 + pz) * 0.12 * warp;
    const broken =
      1 + 0.19 * Math.sin(angle * 5 + px) + 0.12 * Math.cos(angle * 9);
    const ridge = Math.max(0, 1 - Math.hypot(wx * 0.76, wz * 1.15) * broken);
    const flank = Math.max(
      0,
      1 - Math.hypot((dx - 0.42) * 1.5, (dz + 0.2) * 1.8),
    );
    const cut = 0.78 + 0.22 * Math.abs(Math.sin(dx * 13 + dz * 9 + px));
    if (cliffs) {
      // Resistant shoulders separated by eroded ledges. The summit remains
      // sharp; irregular gullies break up each face rather than making cones.
      const shoulder =
        0.28 * smooth(0.05, 0.24, ridge) +
        0.24 * smooth(0.31, 0.45, ridge) +
        0.48 * (Math.max(0, ridge - 0.45) / 0.55) ** 1.1;
      const gullies =
        1 -
        0.24 *
          smooth(
            0.7,
            1,
            Math.abs(Math.sin(dx * 7 - dz * 4 + Math.sin(dz * 4))),
          ) *
          smooth(0.08, 0.4, ridge);
      h += height * (shoulder * gullies * cut + flank ** 1.4 * 0.3);
    } else h += height * (ridge ** 1.1 * cut + flank ** 1.4 * 0.3);
  }
  const shoreRelief =
    Math.sin(x * 57 + Math.sin(z * 39)) * Math.cos(z * 43) * 0.002 +
    Math.sin(x * 17 - z * 21) * 0.004;
  h += shoreRelief * inland;
  // A low offshore platform supports the three navigable sentinel towers.
  const platform =
    1 - smooth(0.6, 1, Math.hypot((x - 0.84) / 0.24, (z - 1.33) / 0.3));
  h = Math.max(h, -0.09 + platform * 0.13);
  const blend = smooth(0.12, 0.24, distance);
  const regional =
    -0.1 +
    Math.max(0, -z) * 0.02 +
    Math.max(0, Math.sin(x * 0.7) * Math.cos(z * 0.6)) * 0.8;
  h = h * (1 - smooth(23, 30, distance)) + regional * smooth(23, 30, distance);
  return legacy * (1 - blend) + h * blend + foregroundRelief;
}
