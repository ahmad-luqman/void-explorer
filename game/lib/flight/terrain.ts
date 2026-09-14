import { Color } from 'three';
import { type Body } from './universe';
export function terrainColor(
  height: number,
  kind: Body['kind'],
  variation = 1,
) {
  const palettes = {
    ocean: ['#092e50', '#11647b', '#369d9e', '#665d9c', '#be83ce'],
    desert: ['#41213b', '#87405c', '#b56c73', '#d69b87', '#f9d7b4'],
    ice: ['#174358', '#377e8f', '#84b7c9', '#b0ccdf', '#e5e5f9'],
  };
  if (kind === 'ocean' && height < 0.0002) {
    const deep = new Color('#092e50'),
      shallow = new Color('#248e9c');
    return (
      height <= 0
        ? deep.lerp(shallow, Math.exp(height / 0.006))
        : shallow.lerp(new Color('#72afa6'), Math.min(1, height / 0.0002))
    ).multiplyScalar(variation);
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
  return new Color(palettes[kind][index]).multiplyScalar(variation);
}
