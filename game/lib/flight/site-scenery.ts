import { sitePoint, nearbySite } from './sites';
import type { ContactSurface } from './contact';
import type { Vector3 } from 'three';
import type { SurfaceProp } from './scenery';
// Deliberate silhouettes around open survey lanes; coordinates are meters / 1000.
const relay = [
  [-65, 75, 5, 22],
  [65, 75, 5, 28],
  [-85, 95, 4, 15],
  [85, 95, 4, 18],
  [-115, 145, 8, 4],
  [-100, 174, 6, 5],
  [-74, 160, 5, 6],
  [-115, 182, 4, 3],
  [125, 180, 7, 36],
  [92, 207, 5, 16],
  [137, 213, 4, 11],
  [-55, 35, 9, 5],
  [65, 25, 7, 4],
  [-145, 90, 10, 7],
  [165, 110, 12, 8],
];
const choir = [
  [-65, 80, 6, 30],
  [65, 80, 7, 39],
  [-85, 95, 5, 21],
  [85, 100, 6, 26],
  [-115, 150, 8, 13],
  [-94, 174, 5, 8],
  [-74, 155, 4, 11],
  [130, 180, 10, 49],
  [101, 212, 7, 31],
  [149, 211, 6, 22],
  [-56, 30, 5, 12],
  [61, 24, 4, 8],
  [-150, 95, 11, 22],
  [175, 100, 10, 27],
];
export function authoredScenery(
  patch: ContactSurface,
  focus: Vector3,
): SurfaceProp[] {
  const site = nearbySite(focus, patch.body);
  if (!site || site.id === 'lumen-coast') return [];
  const ice = site.id === 'glass-choir';
  return (ice ? choir : relay).flatMap(([x, z, r, h], i) => {
    const ground = patch.sample(
      sitePoint(site, patch.body, x / 1000, z / 1000),
    );
    if (!ground || ground.water || ground.slope > 20) return [];
    return [
      {
        id: `${patch.body.id}:authored:${site.id}:${i}`,
        point: ground.point,
        normal: ground.normal,
        radius: r / 1000,
        height: h / 1000,
        yaw: (i * 0.73) % (Math.PI * 2),
        mineral: false,
        shape: ice ? 'crystal' : 'relay',
        tint: ice
          ? i % 2
            ? '#6ac4d5'
            : '#9ed8df'
          : i % 2
            ? '#c78f72'
            : '#82545f',
        landmark: site.name,
      } as SurfaceProp,
    ];
  });
}
