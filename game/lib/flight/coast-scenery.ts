import { Vector3 } from 'three';
import { coastCoordinates, coastDirection, COAST_UP } from './coast';
import { fromPlanet, toPlanet } from './rotation';
import { random, surfaceRadius } from './universe';
import type { ContactSurface } from './contact';
import type { SurfaceProp } from './scenery';

export function coastalScenery(
  patch: ContactSurface,
  focus: Vector3,
): SurfaceProp[] {
  const body = patch.body;
  const native = toPlanet(focus, body).normalize();
  if (
    body.id !== 'p0-0' ||
    (body.terrainVersion ?? 1) < 2 ||
    native.dot(COAST_UP) < 0.99998
  )
    return [];
  const { x: fx, z: fz } = coastCoordinates(native, body.radius);
  const vista = (body.terrainVersion ?? 1) >= 4;
  const props: SurfaceProp[] = [];
  const place = (
    id: string,
    x: number,
    z: number,
    radius: number,
    height: number,
    yaw: number,
    shape?: SurfaceProp['shape'],
    tint?: string,
  ) => {
    if (
      Math.hypot(x, z) < 0.039 + radius ||
      Math.hypot(x - fx, z - fz) >
        (shape === 'landmark' ? (vista ? 3 : 1.4) : 0.8)
    )
      return;
    // Keep a narrow walking route from either side exit toward the overlook.
    if (
      Math.min(Math.abs(x - 0.027 - z * 0.65), Math.abs(x + 0.027 - z * 0.65)) <
        (vista ? 0.0025 : 0.008) + radius &&
      z > -0.01 &&
      z < 0.105
    )
      return;
    const direction = coastDirection(x, z, body.radius);
    const point = fromPlanet(
      direction.clone().multiplyScalar(surfaceRadius(direction, body)),
      body,
    );
    const ground = patch.sample(point);
    if (!ground || ground.water || ground.slope > 32) return;
    props.push({
      id: `${body.id}:coast:${id}`,
      point: ground.point,
      normal: ground.normal,
      radius,
      height,
      yaw,
      mineral: false,
      shape,
      tint,
      landmark: shape === 'landmark' ? 'Tide Sentinels' : undefined,
    });
  };
  if (vista) {
    // Small collidable stones give the walking foreground scale, while retaining
    // a five-meter-wide route and the original 35 m landing footprint.
    for (let cx = -34; cx <= 34; cx++)
      for (let cz = -25; cz <= 40; cz++) {
        const rng = random(
          Math.imul(cx, 19349663) ^ Math.imul(cz, 83492791) ^ 36413,
        );
        if (rng() < 0.62) continue;
        const x = (cx + rng()) * 0.004,
          z = (cz + rng()) * 0.004;
        place(
          `vista:near:${cx}:${cz}`,
          x,
          z,
          0.00025 + rng() * 0.00055,
          0.00012 + rng() * 0.0003,
          rng() * 6.28,
          undefined,
          '#a48697',
        );
      }
    // Deliberate foreground groups flank the overlook. Fixed native positions
    // keep composition stable as the terrain rotates or a save is restored.
    const clusters = [
      [0.034, 0.029, 0.003, 0.0017],
      [0.034, 0.046, 0.0035, 0.002],
      [0.069, 0.042, 0.004, 0.0025],
      [0.08, 0.062, 0.006, 0.004],
      [0.052, 0.071, 0.004, 0.002],
      [-0.044, 0.032, 0.009, 0.006],
      [0.014, 0.057, 0.007, 0.004],
      [0.083, 0.027, 0.011, 0.008],
      [-0.043, 0.076, 0.013, 0.01],
      [0.014, 0.102, 0.009, 0.006],
      [0.119, 0.063, 0.013, 0.009],
      [-0.099, 0.028, 0.02, 0.018],
      [0.15, -0.037, 0.022, 0.018],
      [-0.09, -0.05, 0.012, 0.007],
      [0.032, -0.064, 0.008, 0.005],
      // Low foreground groups frame the approach to the overlook without
      // enclosing the walking corridor or the ship's protected clearing.
      [0.018, 0.048, 0.0028, 0.0015],
      [0.047, 0.05, 0.0035, 0.0018],
      [0.098, 0.065, 0.0045, 0.0026],
      // Frame the view from the first survey stop, rather than placing every
      // anchor beyond it. These remain outside both lanes and the ship pad.
      [0.046, 0.04, 0.0032, 0.0015],
      [0.061, 0.034, 0.003, 0.0014],
      [0.0515, 0.03, 0.0014, 0.00065],
    ];
    clusters.forEach(([x, z, r, h], n) => {
      const rng = random(n * 19349663 + 7621);
      place(`vista:hero:${n}`, x, z, r, h, rng() * 6.28, undefined, '#80647b');
      for (let i = 0; i < 14; i++) {
        const a = rng() * 6.28,
          distance = r * (0.8 + rng() * 1.4);
        const fan = i % 3 === 0;
        const lowGroup = n >= 15;
        // Keep the existing seed order and placements. At the new near groups,
        // tiny fragments are low rubble rather than meter-tall pointed stones.
        const px = x + Math.cos(a) * distance;
        const pz = z + Math.sin(a) * distance;
        const radius = fan
          ? lowGroup
            ? 0.0012 + rng() * 0.0013
            : 0.0025 + rng() * 0.0025
          : 0.0004 + rng() * 0.0017;
        const height = fan
          ? lowGroup
            ? 0.0007 + rng() * 0.0009
            : 0.002 + rng() * 0.0025
          : 0.0003 + rng() * 0.0013;
        place(
          `vista:hero:${n}:${i}`,
          px,
          pz,
          radius,
          n >= 18 && !fan ? Math.min(height, radius * 0.65) : height,
          rng() * 6.28,
          fan ? 'fan' : undefined,
          fan ? '#ffffff' : '#95788b',
        );
      }
    });
    // Sparse medium-distance groups, with denser gravel around the overlook.
    const cell = 0.022;
    const span = 37;
    for (
      let cx = Math.floor(fx / cell) - span;
      cx <= Math.floor(fx / cell) + span;
      cx++
    )
      for (
        let cz = Math.floor(fz / cell) - span;
        cz <= Math.floor(fz / cell) + span;
        cz++
      ) {
        const rng = random(
          Math.imul(cx, 73856093) ^ Math.imul(cz, 19349663) ^ 11983,
        );
        if (rng() < 0.35) continue;
        const x = (cx + rng()) * cell,
          z = (cz + rng()) * cell;
        const stone = rng() < 0.5;
        place(
          `vista:cell:${cx}:${cz}`,
          x,
          z,
          0.0018 + rng() * (stone ? 0.005 : 0.0025),
          0.0012 + rng() * (stone ? 0.006 : 0.0028),
          rng() * 6.28,
          stone ? undefined : 'fan',
          stone ? '#79627b' : '#ffffff',
        );
        for (let i = 0; i < 3; i++) {
          const a = rng() * 6.28,
            r = 0.004 + rng() * 0.008;
          place(
            `vista:gravel:${cx}:${cz}:${i}`,
            x + Math.cos(a) * r,
            z + Math.sin(a) * r,
            0.00035 + rng() * 0.0012,
            0.00025 + rng() * 0.0008,
            rng() * 6.28,
            undefined,
            '#98788d',
          );
        }
      }
    place(
      'vista:sentinels',
      0.84,
      1.33,
      0.14,
      0.24,
      0.4,
      'landmark',
      '#987889',
    );
    place(
      'vista:sentinels-west',
      -0.29,
      -0.025,
      0.042,
      0.055,
      2.1,
      'landmark',
      '#79647e',
    );
    return props;
  }
  // Fixed seed cells cluster low broad foliage with rubble; they never follow the camera.
  for (
    let x = Math.floor(fx / 0.035) - 24;
    x <= Math.floor(fx / 0.035) + 24;
    x++
  )
    for (
      let z = Math.floor(fz / 0.035) - 24;
      z <= Math.floor(fz / 0.035) + 24;
      z++
    ) {
      const rng = random(
        Math.imul(x, 73856093) ^ Math.imul(z, 19349663) ^ 55791,
      );
      if (rng() < 0.22) continue;
      const px = (x + rng()) * 0.035,
        pz = (z + rng()) * 0.035;
      const stone = rng() > 0.65;
      place(
        `${x}:${z}:0`,
        px,
        pz,
        0.002 + rng() * (stone ? 0.005 : 0.002),
        0.0015 + rng() * (stone ? 0.006 : 0.002),
        rng() * 6.28,
        stone ? undefined : 'fan',
        stone ? '#795a80' : '#507f79',
      );
      for (let i = 1; i < 4; i++) {
        const a = rng() * 6.28,
          r = 0.004 + rng() * 0.006;
        place(
          `${x}:${z}:${i}`,
          px + Math.cos(a) * r,
          pz + Math.sin(a) * r,
          0.0007 + rng() * 0.0017,
          0.0005 + rng() * 0.0016,
          rng() * 6.28,
          i === 1 ? 'fan' : undefined,
          i === 1 ? '#b57b95' : '#79627d',
        );
      }
    }
  place('sentinels', 0.17, 0.095, 0.032, 0.087, 0.4, 'landmark', '#876784');
  place(
    'sentinels-west',
    -0.38,
    -0.02,
    0.036,
    0.075,
    2.1,
    'landmark',
    '#715b7d',
  );
  return props;
}
