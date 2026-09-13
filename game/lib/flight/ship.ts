import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createFallbackShip } from './ship-fallback';
export type ShipRig = {
  ship: T.Group;
  engines: T.Mesh[];
  gear: T.Object3D;
  cores: T.Mesh[];
  modelSource: 'loading' | 'authored' | 'fallback';
  dispose: () => void;
};
function release(root: T.Object3D) {
  const materials = new Set<T.Material>();
  root.traverse((o) => {
    const m = o as T.Mesh;
    if (m.geometry) m.geometry.dispose();
    if (m.material)
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) =>
        materials.add(mat),
      );
  });
  materials.forEach((m) => m.dispose());
}
export function createShip(): ShipRig {
  const fallback = createFallbackShip();
  fallback.ship.traverse((o) => {
    if ((o as T.Mesh).isMesh && !fallback.engines.includes(o as T.Mesh))
      o.castShadow = true;
  });
  let disposed = false;
  const rig: ShipRig = {
    ...fallback,
    cores: [],
    modelSource: 'loading',
    dispose: () => {
      disposed = true;
    },
  };
  new GLTFLoader().load(
    '/models/aurora-v1.glb',
    (gltf) => {
      if (disposed) {
        release(gltf.scene);
        return;
      }
      const gear = gltf.scene.getObjectByName('LandingGear'),
        cores: T.Mesh[] = [];
      gltf.scene.traverse((o) => {
        if ((o as T.Mesh).isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
        if (o.name.startsWith('EngineCore_') && (o as T.Mesh).isMesh)
          cores.push(o as T.Mesh);
      });
      if (!gear || cores.length !== 2) {
        release(gltf.scene);
        rig.modelSource = 'fallback';
        return;
      }
      // Authored meters -> legacy ship units; the flight renderer then applies .004 km/unit.
      gltf.scene.scale.setScalar(0.25);
      gear.visible = rig.gear.visible;
      // Snapshot children because removing each object mutates the original array.
      // eslint-disable-next-line unicorn/no-useless-spread
      for (const child of [...rig.ship.children])
        if (!rig.engines.includes(child as T.Mesh)) {
          rig.ship.remove(child);
          release(child);
        }
      for (const flame of rig.engines) {
        flame.position.y = 0.05;
        flame.position.z = 3.15;
      }
      rig.ship.add(gltf.scene);
      rig.gear = gear;
      rig.cores = cores;
      rig.modelSource = 'authored';
    },
    undefined,
    () => {
      if (!disposed) rig.modelSource = 'fallback';
    },
  );
  return rig;
}
