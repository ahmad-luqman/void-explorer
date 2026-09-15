import { expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  waterTextureAnchor,
  WATER_DETAIL_SCALE,
  WATER_SWELL_SCALE,
  waterTextureData,
} from '../lib/flight/water-texture';

it('keeps wave phase continuous across contact, patch and globe coordinates', () => {
  const native = new Vector3(342.681, -978.327, 214.774);
  const wrap = (v: number) => ((v % 1) + 1) % 1;
  for (const scale of [WATER_DETAIL_SCALE, WATER_SWELL_SCALE]) {
    const expected = native.clone().multiplyScalar(scale).toArray().map(wrap);
    for (const anchor of [
      new Vector3(),
      new Vector3(342.7, -978.3, 214.8),
      new Vector3(342, -978, 214),
    ]) {
      const phase = native
        .clone()
        .sub(anchor)
        .multiplyScalar(scale)
        .add(waterTextureAnchor(anchor, scale));
      phase
        .toArray()
        .map(wrap)
        .forEach((value, i) => expect(value).toBeCloseTo(expected[i], 9));
    }
  }
});

it('has no discontinuous edge in the repeating wave field', () => {
  const size = 128,
    data = waterTextureData(size);
  for (const channel of [0, 1, 2]) {
    let interior = 0,
      seam = 0;
    const at = (x: number, y: number) => data[(y * size + x) * 4 + channel];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        if (x < size - 1)
          interior = Math.max(interior, Math.abs(at(x + 1, y) - at(x, y)));
        if (y < size - 1)
          interior = Math.max(interior, Math.abs(at(x, y + 1) - at(x, y)));
        seam = Math.max(
          seam,
          Math.abs(at(0, y) - at(size - 1, y)),
          Math.abs(at(x, 0) - at(x, size - 1)),
        );
      }
    expect(interior).toBeGreaterThan(0);
    expect(seam).toBeLessThanOrEqual(interior);
  }
});
