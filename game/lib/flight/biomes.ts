import type { Vector3 } from 'three';
import { elevation, type Body } from './universe';

export type Biome = {
  id: string;
  name: string;
  color: string;
  vegetation: 'fan' | 'succulent' | null;
  density: number;
};
const regions: Record<Body['kind'], Biome[]> = {
  ocean: [
    {
      id: 'littoral',
      name: 'Tidal terraces',
      color: '#7da8a8',
      vegetation: 'fan',
      density: 0.32,
    },
    {
      id: 'grove',
      name: 'Violet groves',
      color: '#586487',
      vegetation: 'fan',
      density: 0.7,
    },
    {
      id: 'upland',
      name: 'Amethyst uplands',
      color: '#a47cb4',
      vegetation: 'fan',
      density: 0.15,
    },
  ],
  desert: [
    {
      id: 'salt',
      name: 'Rose salt flats',
      color: '#dab5c4',
      vegetation: 'succulent',
      density: 0.12,
    },
    {
      id: 'dune',
      name: 'Copper steppe',
      color: '#b97869',
      vegetation: 'succulent',
      density: 0.38,
    },
    {
      id: 'mesa',
      name: 'Cinder mesas',
      color: '#75516c',
      vegetation: 'succulent',
      density: 0.18,
    },
  ],
  ice: [
    {
      id: 'blue-ice',
      name: 'Blue ice fields',
      color: '#5c9eb5',
      vegetation: null,
      density: 0,
    },
    {
      id: 'frost',
      name: 'Pearl frost plains',
      color: '#b4cadb',
      vegetation: null,
      density: 0,
    },
    {
      id: 'ridge',
      name: 'Glacial ridges',
      color: '#8e92bc',
      vegetation: null,
      density: 0,
    },
  ],
};

// Smooth, seeded regions in the native planet frame; geometry is unchanged.
export function sampleBiome(
  direction: Vector3,
  body: Body,
  height = elevation(direction, body),
): Biome {
  const d = direction.clone().normalize();
  if (body.kind === 'ocean' && height <= 0)
    return {
      id: 'ocean',
      name: 'Open ocean',
      color: '#11647b',
      vegetation: null,
      density: 0,
    };
  if (body.kind === 'ocean' && height / body.radius < 0.0012)
    return regions.ocean[0];
  const climate =
    Math.sin(d.x * 11 + body.seed * 0.13) * 0.5 +
    Math.cos(d.z * 9 - d.y * 7 + body.seed * 0.07) * 0.3 +
    Math.sin(d.y * 19 + d.x * 5) * 0.2;
  const index =
    body.kind === 'ocean'
      ? height / body.radius > 0.036 || Math.abs(d.y) > 0.8 || climate < -0.12
        ? 2
        : 1
      : climate < -0.25
        ? 0
        : climate > 0.28
          ? 2
          : 1;
  return regions[body.kind][index];
}
