import {
  DataTexture,
  RGBAFormat,
  UnsignedByteType,
  RepeatWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  Vector3,
} from 'three';

// 2.5 physical meters per repeat. RGB is a linear mineral albedo field;
// alpha is relief, sampled by the same filtered lookup on both backends.
export const GROUND_TEXTURE_SCALE = 400;
export const GROUND_TEXTURE_SIZE = 512;
const wrap = (x: number, period: number) => ((x % period) + period) % period;
function hash(x: number, y: number, period: number) {
  let h =
    Math.imul(wrap(x, period), 374761393) ^
    Math.imul(wrap(y, period), 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x: number, y: number, frequency: number) {
  x *= frequency;
  y *= frequency;
  const ix = Math.floor(x),
    iy = Math.floor(y);
  let fx = x - ix,
    fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, frequency),
    b = hash(ix + 1, iy, frequency),
    c = hash(ix, iy + 1, frequency),
    d = hash(ix + 1, iy + 1, frequency);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
const smooth = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function groundTextureData(size = GROUND_TEXTURE_SIZE) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size;
      // Periodic warp breaks regular cell boundaries without a visible tile seam.
      const px = u * 9 + (noise(u, v, 8) - 0.5) * 0.7,
        py = v * 9 + (noise(u + 0.31, v + 0.61, 8) - 0.5) * 0.7;
      const cx = Math.floor(px),
        cy = Math.floor(py);
      let first = Infinity,
        second = Infinity,
        identity = 0;
      for (let oy = -1; oy <= 1; oy++)
        for (let ox = -1; ox <= 1; ox++) {
          const hx = hash(cx + ox, cy + oy, 9),
            hy = hash(cx + ox + 37, cy + oy + 13, 9);
          const dx = cx + ox + 0.15 + hx * 0.7 - px,
            dy = cy + oy + 0.15 + hy * 0.7 - py;
          const distance = dx * dx + dy * dy;
          if (distance < first) {
            second = first;
            first = distance;
            identity = hx;
          } else second = Math.min(second, distance);
        }
      const edge = Math.sqrt(second) - Math.sqrt(first);
      const grain = noise(u, v, 128),
        chips = noise(u, v, 64);
      const fracture = smooth(0.012, 0.04 + chips * 0.075, edge);
      const dust = smooth(
        0.42,
        0.7,
        noise(u + 0.4, v, 4) * 0.7 + noise(u, v, 16) * 0.3,
      );
      const stone =
        (0.69 + identity * 0.3 + grain * 0.09) * (0.73 + fracture * 0.27);
      const dustTone = 0.96 + grain * 0.14;
      const tone = stone * (1 - dust) + dustTone * dust;
      const channels = [
        tone * (1 + dust * 0.07),
        tone * (0.97 + dust * 0.03),
        tone * (1.02 - dust * 0.12),
      ];
      const offset = (y * size + x) * 4;
      for (let c = 0; c < 3; c++)
        data[offset + c] = Math.round(Math.min(1, channels[c] / 1.5) * 255);
      const height =
        ((0.3 + identity * 0.22) * fracture + chips * 0.07 + grain * 0.035) *
          (1 - dust) +
        (0.42 + grain * 0.02) * dust;
      data[offset + 3] = Math.round(height * 255);
    }
  return data;
}
let shared: DataTexture | undefined;
export function groundTexture() {
  if (!shared) {
    shared = new DataTexture(
      groundTextureData(),
      GROUND_TEXTURE_SIZE,
      GROUND_TEXTURE_SIZE,
      RGBAFormat,
      UnsignedByteType,
    );
    shared.wrapS = shared.wrapT = RepeatWrapping;
    shared.magFilter = LinearFilter;
    shared.minFilter = LinearMipmapLinearFilter;
    shared.generateMipmaps = true;
    shared.anisotropy = 4;
    shared.needsUpdate = true;
    shared.name = 'Native fractured rock and dust';
  }
  return shared;
}
export function groundTextureAnchor(anchor: Vector3) {
  return new Vector3(
    wrap(anchor.x * GROUND_TEXTURE_SCALE, 1),
    wrap(anchor.y * GROUND_TEXTURE_SCALE, 1),
    wrap(anchor.z * GROUND_TEXTURE_SCALE, 1),
  );
}
