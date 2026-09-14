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
    body.terrainVersion !== 2 ||
    native.dot(COAST_UP) < 0.99998
  )
    return [];
  const { x: fx, z: fz } = coastCoordinates(native, body.radius);
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
      Math.hypot(x - fx, z - fz) > (shape === 'landmark' ? 1.4 : 0.8)
    )
      return;
    // Keep a narrow walking route from either side exit toward the overlook.
    if (
      Math.min(Math.abs(x - 0.027 - z * 0.65), Math.abs(x + 0.027 - z * 0.65)) <
        0.008 + radius &&
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
