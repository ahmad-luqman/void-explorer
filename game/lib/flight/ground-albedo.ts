import {
  TextureLoader,
  MirroredRepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from 'three';

export const GROUND_ALBEDO_SCALE = 1 / 0.006;
// Generated albedo is mirrored at the tile boundary: no dependency on the image
// model delivering identical opposite edges. Native phase repeats every two tiles.
export function groundAlbedoAnchor(anchor: Vector3) {
  const wrap = (v: number) => (((v * GROUND_ALBEDO_SCALE) % 2) + 2) % 2;
  return new Vector3(wrap(anchor.x), wrap(anchor.y), wrap(anchor.z));
}
let shared: ReturnType<typeof load> | undefined;
function load() {
  const ready = { value: 0 };
  const texture = new TextureLoader().load(
    '/textures/coastal-ground-v1.jpg',
    () => {
      ready.value = 1;
    },
    undefined,
    () => {
      /* Procedural ground remains available offline. */
    },
  );
  texture.wrapS = texture.wrapT = MirroredRepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  texture.name = 'Coastal slate and grit albedo';
  return { texture, ready };
}
export function groundAlbedo() {
  return (shared ??= load());
}
