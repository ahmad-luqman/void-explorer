import { Vector3 } from 'three';
import { localDirection } from './rotation';

export type WorldKind = 'ocean' | 'desert' | 'ice';
export type Body = {
  id: string;
  name: string;
  position: Vector3;
  radius: number;
  seed: number;
  kind: WorldKind;
  ring: boolean;
  system: number;
  star?: boolean;
  rotationClock?: { time: number };
  color?: string;
};
export type System = {
  id: number;
  name: string;
  position: Vector3;
  color: string;
  planets: Body[];
  star: Body;
  companion: Body | null;
};

export function random(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const prefixes = [
  'Vesper',
  'Orison',
  'Solis',
  'Cinder',
  'Nacre',
  'Lyra',
  'Halcyon',
  'Eidolon',
  'Solace',
  'Meridian',
  'Aster',
  'Velorum',
];
export const SYSTEM_COUNT = 1024;
export function createUniverse(): System[] {
  const rng = random(90519);
  return Array.from({ length: SYSTEM_COUNT }, (_, id) => {
    const az = rng() * Math.PI * 2,
      y = rng() * 2 - 1,
      r = 65000 + Math.cbrt(rng()) * 650000;
    const position =
      id === 0
        ? new Vector3(7000, 7200, -19000)
        : new Vector3(
            Math.cos(az) * Math.sqrt(1 - y * y),
            y,
            Math.sin(az) * Math.sqrt(1 - y * y),
          ).multiplyScalar(r);
    const name =
      id === 0
        ? 'Astris Prime'
        : `${prefixes[id % prefixes.length]} ${String(id).padStart(3, '0')}`;
    const color =
      id === 0
        ? '#ffc775'
        : ['#ffe4a1', '#86ceff', '#ff936e', '#d0d9ff'][Math.floor(rng() * 4)];
    const star: Body = {
      id: `s${id}`,
      name,
      position,
      radius: 480 + rng() * 350,
      seed: id * 73,
      kind: 'desert',
      ring: false,
      system: id,
      star: true,
      color,
    };
    const planets = Array.from({ length: 3 }, (_, p): Body => {
      const a = rng() * Math.PI * 2,
        orbit = 6500 + p * 5500;
      return {
        id: `p${id}-${p}`,
        name: `${name} ${['b', 'c', 'd'][p]}`,
        position: position
          .clone()
          .add(
            new Vector3(
              Math.cos(a) * orbit,
              (rng() - 0.5) * 2200,
              Math.sin(a) * orbit,
            ),
          ),
        radius: 650 + rng() * 550,
        seed: id * 103 + p * 971 + 19,
        kind: (['ocean', 'desert', 'ice'] as const)[p],
        ring: p === 0 && id % 3 === 0,
        system: id,
      };
    });
    if (id === 0) {
      planets[0] = {
        id: 'p0-0',
        name: 'Aurelia Veil',
        position: new Vector3(0, 0, 0),
        radius: 1000,
        seed: 19,
        kind: 'ocean',
        ring: true,
        system: 0,
      };
      planets[1].name = 'Ember Reach';
      planets[1].position.set(-6100, 1700, -4800);
      planets[2].name = 'Nivalis';
      planets[2].position.set(6900, -1600, -9000);
    }
    const companion: Body | null =
      id === 0
        ? {
            ...star,
            id: 's0-b',
            name: 'Astris Minor',
            position: new Vector3(7000, 9000, 12000),
            radius: 420,
            color: '#ffa75d',
          }
        : null;
    return { id, name, position, color, star, planets, companion };
  });
}

function hash(x: number, y: number, z: number, seed: number) {
  let h =
    Math.imul(x, 374761393) +
    Math.imul(y, 668265263) +
    Math.imul(z, 2147483647) +
    Math.imul(seed, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise(x: number, y: number, z: number, seed: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    iz = Math.floor(z);
  let fx = x - ix,
    fy = y - iy,
    fz = z - iz;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  fz = fz * fz * (3 - 2 * fz);
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  const h = (dx: number, dy: number, dz: number) =>
    hash(ix + dx, iy + dy, iz + dz, seed);
  return mix(
    mix(mix(h(0, 0, 0), h(1, 0, 0), fx), mix(h(0, 1, 0), h(1, 1, 0), fx), fy),
    mix(mix(h(0, 0, 1), h(1, 0, 1), fx), mix(h(0, 1, 1), h(1, 1, 1), fx), fy),
    fz,
  );
}
export function elevation(direction: Vector3, body: Body): number {
  const { x, y, z } = direction;
  const broad = noise(x * 3 + 4, y * 3 + 8, z * 3 + 2, body.seed);
  const ridges = noise(x * 13, y * 13, z * 13, body.seed + 5);
  const detail = noise(x * 39, y * 39, z * 39, body.seed + 17);
  return (
    (broad - 0.47) * body.radius * 0.17 +
    Math.max(0, ridges - 0.48) * body.radius * 0.085 +
    (detail - 0.5) * body.radius * 0.009
  );
}
export function surfaceRadius(direction: Vector3, body: Body) {
  return (
    body.radius +
    (body.star
      ? 0
      : body.kind === 'ocean'
        ? Math.max(0, elevation(direction, body))
        : elevation(direction, body))
  );
}
// World-space callers must undo rotation before sampling the native heightfield.
export function worldSurfaceRadius(direction: Vector3, body: Body) {
  return surfaceRadius(localDirection(direction, body), body);
}
export function nearestSystem(position: Vector3, systems: System[]) {
  let nearest = systems[0],
    distance = Infinity;
  for (const s of systems) {
    const d = s.position.distanceToSquared(position);
    if (d < distance) {
      nearest = s;
      distance = d;
    }
  }
  return nearest;
}
export function distanceLabel(km: number) {
  return km >= 1000000
    ? `${(km / 1000000).toFixed(2)} M km`
    : `${Math.max(0, km).toLocaleString('en-US', { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}
