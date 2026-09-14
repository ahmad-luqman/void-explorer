import { Color } from 'three';
import type { Biome } from './biomes';
import { type Body } from './universe';
export function terrainColor(
  height: number,
  kind: Body['kind'],
  variation = 1,
  biome?: Biome,
) {
  const palettes = {
    ocean: ['#ab8594', '#886b87', '#76627e', '#665578', '#b18db8'],
    desert: ['#41213b', '#87405c', '#b56c73', '#d69b87', '#f9d7b4'],
    ice: ['#174358', '#377e8f', '#84b7c9', '#b0ccdf', '#e5e5f9'],
  };
  if (kind === 'ocean' && height <= 0) {
    return new Color('#123e65')
      .lerp(new Color('#38aaa6'), Math.exp(height / 0.00018))
      .multiplyScalar(variation);
  }
  const index =
    kind === 'ocean'
      ? height <= 0.00015
        ? 0
        : height < 0.005
          ? 1
          : height < 0.015
            ? 2
            : height < 0.03
              ? 3
              : 4
      : Math.min(4, Math.max(0, Math.floor((height + 0.06) * 43)));
  const color = new Color(palettes[kind][index]);
  if (biome) color.lerp(new Color(biome.color), 0.6);
  return color.multiplyScalar(variation);
}
