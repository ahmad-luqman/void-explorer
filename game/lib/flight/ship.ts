import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { bindLandingGear } from './landing-gear';
import { createFallbackShip } from './ship-fallback';
export type ShipRig = {
  ship: T.Group;
  engines: T.Mesh[];
  gear: T.Object3D;
  cores: T.Mesh[];
  setGearDeployment: (deployment: number) => void;
  modelSource: 'loading' | 'authored' | 'fallback';
  dispose: () => void;
};
function releaseSkeletons(root: T.Object3D) {
  const skeletons = new Set<T.Skeleton>();
  root.traverse((object) => {
    if ((object as T.SkinnedMesh).isSkinnedMesh)
      skeletons.add((object as T.SkinnedMesh).skeleton);
  });
  skeletons.forEach((skeleton) => skeleton.dispose());
}
function release(root: T.Object3D) {
  releaseSkeletons(root);
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
  let deployment = 0;
  let poseGear = bindLandingGear(fallback.gear);
  poseGear(deployment);
  const rig: ShipRig = {
    ...fallback,
    cores: [],
    modelSource: 'loading',
    setGearDeployment: (value) => {
      deployment = value;
      poseGear(value);
    },
    dispose: () => {
      disposed = true;
      releaseSkeletons(rig.ship);
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
      const finished = new Set<T.Material>();
      gltf.scene.traverse((o) => {
        if ((o as T.Mesh).isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          const mesh = o as T.Mesh;
          for (const material of Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]) {
            if (
              !(material instanceof T.MeshStandardMaterial) ||
              finished.has(material)
            )
              continue;
            finished.add(material);
            // The scene has directional lighting but no environment probe. Low
            // armor metalness keeps the ivory readable instead of near-black.
            if (
              material.name === 'Ivory armor' ||
              material.name === 'Pale armor'
            ) {
              material.color.set(
                material.name === 'Ivory armor' ? '#d8d0bc' : '#eee5d1',
              );
              material.metalness = 0.08;
              material.roughness = 0.48;
            } else if (material.name === 'Graphite structure') {
              material.color.set('#28313d');
              material.metalness = 0.28;
              material.roughness = 0.64;
            } else if (material.name === 'Titanium trim') {
              material.color.set('#697780');
              material.metalness = 0.38;
              material.roughness = 0.36;
            } else if (material.name === 'Teal canopy') {
              material.color.set('#126577');
              material.metalness = 0.18;
              material.roughness = 0.14;
              material.emissiveIntensity = 0.06;
            }
          }
        }
        if (o.name.startsWith('EngineCore_') && (o as T.Mesh).isMesh)
          cores.push(o as T.Mesh);
      });
      const hasJoints = ['Left', 'Right', 'Nose'].every((leg) =>
        ['Hinge', 'Pad'].every((part) =>
          gear?.getObjectByName(`Gear_${leg}_${part}`),
        ),
      );
      if (!gear || !hasJoints || cores.length !== 2) {
        release(gltf.scene);
        rig.modelSource = 'fallback';
        return;
      }
      // Authored meters -> legacy ship units; the flight renderer then applies .004 km/unit.
      gltf.scene.scale.setScalar(0.25);
      poseGear = bindLandingGear(gear);
      poseGear(deployment);
      gear.traverse((object) => {
        // A tiny moving rig: avoid stale bind-pose bounds during animation.
        object.frustumCulled = false;
      });
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
