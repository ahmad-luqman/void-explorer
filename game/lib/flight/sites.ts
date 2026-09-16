import { Vector3, Quaternion } from 'three';
import { COAST_UP, COAST_FORWARD } from './coast';
import { surfaceRadius, type Body } from './universe';
import { fromPlanet, toPlanet } from './rotation';
export type Observation = {
  id: string;
  name: string;
  x: number;
  z: number;
  text: string;
};
export type ExpeditionSite = {
  id: string;
  name: string;
  bodyId: string;
  up: Vector3;
  forward: Vector3;
  description: string;
  observations: Observation[];
};
const frame = (up: Vector3) =>
  new Vector3(0, 0, 1).addScaledVector(up, -up.z).normalize();
const ember = new Vector3(
  0.6629774686790993,
  0.6613333333333333,
  0.35085481077801406,
).normalize();
const ice = new Vector3(
  0.2785053551283475,
  0.08699999999999997,
  0.9564861562849892,
).normalize();
export const EXPEDITION_SITES: ExpeditionSite[] = [
  {
    id: 'lumen-coast',
    name: 'Lumen Coast',
    bodyId: 'p0-0',
    up: COAST_UP,
    forward: COAST_FORWARD,
    description: 'A violet shore beneath the Tide Sentinels.',
    observations: [
      {
        id: 'lumen-tides',
        name: 'Tidal slate',
        x: 0.045,
        z: 0.025,
        text: 'Parallel seams in the slate record an older, higher shoreline. The islands and their sentinel columns once belonged to the same exposed ridge.',
      },
    ],
  },
  {
    id: 'ember-relay',
    name: 'Ember Relay',
    bodyId: 'p0-1',
    up: ember,
    forward: frame(ember),
    description: 'A silent relay array on a rose-colored desert plateau.',
    observations: [
      {
        id: 'ember-gate',
        name: 'Split receivers',
        x: 0,
        z: 0.075,
        text: 'The two receivers lean toward the binary suns. Their ceramic faces retain a repeating pulse pattern, but the carrier frequency has gone silent.',
      },
      {
        id: 'ember-memory',
        name: 'Memory stones',
        x: -0.095,
        z: 0.15,
        text: 'Low storage blocks form a deliberate spiral. Sand has erased their inscriptions; the sheltered lower faces still carry a map of the three inner worlds.',
      },
      {
        id: 'ember-signal',
        name: 'Last transmitter',
        x: 0.105,
        z: 0.18,
        text: 'The final mast points away from Astris Prime. Its broken crown suggests the relay was listening when it failed, rather than sending a warning.',
      },
    ],
  },
  {
    id: 'glass-choir',
    name: 'Glass Choir',
    bodyId: 'p0-2',
    up: ice,
    forward: frame(ice),
    description: 'Blue crystal towers gathered around a sheltered ice basin.',
    observations: [
      {
        id: 'choir-prisms',
        name: 'Twin prisms',
        x: 0,
        z: 0.08,
        text: 'The twin crystals split the warm light into cold bands. Fine mineral layers inside each tower follow the same rhythm despite their different sizes.',
      },
      {
        id: 'choir-seam',
        name: 'Buried seam',
        x: -0.095,
        z: 0.15,
        text: 'A dark vein runs beneath the smaller shards. The crystal field grew upward from this single seam, lifting ancient dust through the ice.',
      },
      {
        id: 'choir-crown',
        name: 'Crown cluster',
        x: 0.105,
        z: 0.18,
        text: 'The largest cluster is hollow at its heart. Wind crossing the narrow openings produces a low chord that gave this basin its name.',
      },
    ],
  },
];
export const OBSERVATION_COUNT = EXPEDITION_SITES.reduce(
  (total, site) => total + site.observations.length,
  0,
);
export const siteById = (id: string | null) =>
  EXPEDITION_SITES.find((s) => s.id === id);
export const observationById = (id: string) =>
  EXPEDITION_SITES.flatMap((s) => s.observations).find((o) => o.id === id);
export function siteDirection(site: ExpeditionSite, body: Body, x = 0, z = 0) {
  const right = new Vector3().crossVectors(site.forward, site.up).normalize();
  return site.up
    .clone()
    .multiplyScalar(body.radius)
    .addScaledVector(right, x)
    .addScaledVector(site.forward, z)
    .normalize();
}
export function sitePoint(
  site: ExpeditionSite,
  body: Body,
  x = 0,
  z = 0,
  altitude = 0,
) {
  const d = siteDirection(site, body, x, z);
  return fromPlanet(d.multiplyScalar(surfaceRadius(d, body) + altitude), body);
}
/** Safe high orbit, overhead alignment, then a vertical approach to the pad. */
export function siteGuidance(
  position: Vector3,
  body: Body,
  site: ExpeditionSite,
  committed = false,
) {
  const local = toPlanet(position, body),
    radial = local.clone().normalize();
  const angle = radial.angleTo(site.up),
    padRadius = surfaceRadius(site.up, body);
  const cruiseRadius = Math.max(body.radius * 1.17 + 30, padRadius + 25);
  const readyToDescend = angle < 0.0003 && local.length() < padRadius + 15;
  let native: Vector3, stage: string;
  if (committed || readyToDescend) {
    native = site.up.clone().multiplyScalar(padRadius + 0.12);
    stage = 'Descending to landing site';
  } else if (angle > 0.015) {
    if (local.length() < cruiseRadius - 2) {
      native = radial.multiplyScalar(cruiseRadius);
      stage = 'Climbing to transfer altitude';
    } else {
      const turn = new Quaternion().setFromUnitVectors(radial, site.up);
      radial.applyQuaternion(
        new Quaternion().slerp(turn, Math.min(1, 0.1 / angle)),
      );
      native = radial.multiplyScalar(cruiseRadius);
      stage = 'Crossing to landing region';
    }
  } else {
    native = site.up.clone().multiplyScalar(padRadius + 12);
    stage = 'Aligning over landing site';
  }
  const waypoint = fromPlanet(native, body),
    remaining = position.distanceTo(waypoint);
  return {
    waypoint,
    remaining,
    stage,
    readyToDescend,
    arrived: (committed || readyToDescend) && remaining < 0.025,
  };
}
export function nearbySite(position: Vector3, body: Body) {
  const radial = toPlanet(position, body).normalize();
  return EXPEDITION_SITES.find(
    (s) => s.bodyId === body.id && radial.distanceTo(s.up) * body.radius < 0.6,
  );
}
export function validDiscoveries(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= OBSERVATION_COUNT &&
    new Set(value).size === value.length &&
    value.every((v) => typeof v === 'string' && !!observationById(v))
  );
}
