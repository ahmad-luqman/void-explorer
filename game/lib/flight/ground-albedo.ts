import {
  TextureLoader,
  MirroredRepeatWrapping,
  SRGBColorSpace,
  Vector3,
  type Texture,
} from 'three';

export const GROUND_ALBEDO_SCALE = 1 / 0.0024;
// Generated albedo is mirrored at the tile boundary: no dependency on the image
// model delivering identical opposite edges. Native phase repeats every two tiles.
export function groundAlbedoAnchor(anchor: Vector3) {
  const wrap = (v: number) => (((v * GROUND_ALBEDO_SCALE) % 2) + 2) % 2;
  return new Vector3(wrap(anchor.x), wrap(anchor.y), wrap(anchor.z));
}
let shared: ReturnType<typeof load> | undefined;
function load() {
  const ready = { value: 0 };
  let settle!: (loaded: boolean) => void;
  const loaded = new Promise<boolean>((resolve) => {
    settle = resolve;
  });
  const texture = new TextureLoader().load(
    '/textures/coastal-ground-v1.jpg',
    (texture) => {
      // Finish browser image decoding before asking either renderer to upload.
      const image = texture.image as HTMLImageElement;
      Promise.resolve(image.decode?.()).then(
        () => {
          ready.value = 1;
          settle(true);
        },
        () => settle(false),
      );
    },
    undefined,
    () => {
      /* Procedural ground remains available offline. */
      settle(false);
    },
  );
  texture.wrapS = texture.wrapT = MirroredRepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  texture.name = 'Coastal slate and grit albedo';
  return { texture, ready, loaded };
}
export function groundAlbedo() {
  return (shared ??= load());
}

/** Bound optional image preparation so a slow/missing image cannot block play. */
export async function preloadGroundAlbedo(
  upload: (texture: Texture) => void,
  signal?: AbortSignal,
) {
  if (signal?.aborted) return false;
  const asset = groundAlbedo();
  const loaded = await new Promise<boolean>((resolve) => {
    const finish = (value: boolean) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      resolve(value);
    };
    const abort = () => finish(false);
    const timer = setTimeout(() => finish(false), 1500);
    signal?.addEventListener('abort', abort, { once: true });
    void asset.loaded.then(finish);
  });
  if (!loaded || signal?.aborted) return false;
  upload(asset.texture);
  return true;
}
