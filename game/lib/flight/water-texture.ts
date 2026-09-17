import {
  DataTexture,
  RGBAFormat,
  UnsignedByteType,
  RepeatWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  Vector3,
} from 'three';

export const WATER_DETAIL_SCALE = 48;
export const WATER_SWELL_SCALE = 1.3;

// One periodic height field supplies slopes and local roughness to both
// renderers. Integer Fourier frequencies join exactly at the repeating edge.
export function waterTextureData(size = 128) {
  const height = new Float32Array(size * size);
  // Balanced directions avoid a pair of dominant crossing stripe families.
  // Fixed integer frequencies remain seamless and deterministic.
  const waves = Array.from({ length: 24 }, (_, i) => {
    const angle = i * 2.3999632297;
    const frequency = 2 + (i % 8) * 1.8;
    return [
      Math.round(Math.cos(angle) * frequency),
      Math.round(Math.sin(angle) * frequency),
      0.65 / Math.sqrt(frequency),
      ((i * 1.61803398875) % 1) * Math.PI * 2,
    ];
  });
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let value = 0;
      for (const [fx, fy, amplitude, phase] of waves)
        value +=
          amplitude *
          Math.sin(((x * fx + y * fy) * Math.PI * 2) / size + phase);
      height[y * size + x] = value;
    }
  const data = new Uint8Array(size * size * 4);
  const sample = (x: number, y: number) =>
    height[((y + size) % size) * size + ((x + size) % size)];
  const encode = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v * 0.5 + 0.5)) * 255);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      data[i] = encode((sample(x + 1, y) - sample(x - 1, y)) * 1.1);
      data[i + 1] = encode((sample(x, y + 1) - sample(x, y - 1)) * 1.1);
      data[i + 2] = encode(sample(x, y) / 3);
      data[i + 3] = 255;
    }
  return data;
}

let shared: DataTexture | undefined;
export function waterTexture() {
  if (!shared) {
    shared = new DataTexture(
      waterTextureData(),
      128,
      128,
      RGBAFormat,
      UnsignedByteType,
    );
    shared.wrapS = shared.wrapT = RepeatWrapping;
    shared.magFilter = LinearFilter;
    shared.minFilter = LinearMipmapLinearFilter;
    shared.generateMipmaps = true;
    shared.needsUpdate = true;
    shared.name = 'Native ocean wave slopes';
  }
  return shared;
}

export function waterTextureAnchor(anchor: Vector3, scale: number) {
  const wrap = (n: number) => (((n * scale) % 1) + 1) % 1;
  return new Vector3(wrap(anchor.x), wrap(anchor.y), wrap(anchor.z));
}
