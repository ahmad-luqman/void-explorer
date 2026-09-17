import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  groundAlbedoAnchor,
  GROUND_ALBEDO_SCALE,
} from '../lib/flight/ground-albedo';
import {
  groundTextureData,
  groundTextureAnchor,
  GROUND_TEXTURE_SCALE,
  GROUND_TEXTURE_SIZE,
} from '../lib/flight/ground-texture';

describe('native ground material', () => {
  it('keeps filtered relief and albedo periodic with bounded texture memory', () => {
    const size = GROUND_TEXTURE_SIZE,
      data = groundTextureData();
    expect(data.byteLength).toBeLessThanOrEqual(1024 * 1024);
    let seam = 0,
      inner = 0,
      maximum = 0,
      minimum = 255;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        maximum = Math.max(maximum, data[i]);
        minimum = Math.min(minimum, data[i]);
        expect(data[i + 3]).toBeGreaterThan(0);
        expect(data[i + 3]).toBeLessThan(220);
        if (x > 0) inner += Math.abs(data[i] - data[i - 4]);
        if (x === 0)
          seam += Math.abs(data[i] - data[(y * size + size - 1) * 4]);
      }
    // Repeating edges should be no harsher than interior material changes.
    expect(seam / size).toBeLessThan((inner / (size * (size - 1))) * 2);
    expect(maximum - minimum).toBeGreaterThan(100);
    expect(groundTextureData(32)).toEqual(groundTextureData(32));
  });
  it('preserves texture phase when neighboring patches re-anchor, including negative native coordinates', () => {
    const position = new Vector3(-4137.123456, 851.012345, -683.987654);
    const a = new Vector3(-4137.1, 851, -684),
      b = a.clone().add(new Vector3(0.3125, -0.211, 0.141));
    const phase = (anchor: Vector3) =>
      position
        .clone()
        .sub(anchor)
        .multiplyScalar(GROUND_TEXTURE_SCALE)
        .add(groundTextureAnchor(anchor))
        .toArray()
        .map((v) => ((v % 1) + 1) % 1);
    phase(a).forEach((v, i) => expect(v).toBeCloseTo(phase(b)[i], 7));
  });
});

it('retains native slate phase and its rotated blend across patch boundaries', () => {
  const position = new Vector3(-4137.123456, 851.012345, -683.987654);
  const anchors = [
    new Vector3(-4137.1, 851, -684),
    new Vector3(-4136.75, 850.8, -683.5),
  ];
  const phase = (anchor: Vector3, rotated: boolean) => {
    const p = position
      .clone()
      .sub(anchor)
      .multiplyScalar(GROUND_ALBEDO_SCALE)
      .add(groundAlbedoAnchor(anchor));
    const v = rotated ? new Vector3(p.z + 0.73, -p.x + 1.17, p.y + 0.39) : p;
    return v.toArray().map((x) => ((x % 2) + 2) % 2);
  };
  for (const rotated of [false, true])
    phase(anchors[0], rotated).forEach((v, i) =>
      expect(v).toBeCloseTo(phase(anchors[1], rotated)[i], 7),
    );
});
