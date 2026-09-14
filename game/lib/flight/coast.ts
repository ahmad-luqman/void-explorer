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
export function coastalElevation(d: Vector3, radius: number, original: number) {
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
    h += height * Math.max(0, 1 - Math.hypot(dx, dz) * broken) ** 1.5;
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
