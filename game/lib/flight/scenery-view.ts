import * as T from 'three';
import { explorationGeometry } from './scenery-geometry';
import { rockFormation, rockFormationGeometry } from './rock-formations';
import type { SurfaceProp } from './scenery';
import type { WorldKind } from './universe';

// Identity, rather than collection order, keeps a rock's silhouette through rebuilds.
function stoneVariant(id: string) {
  let hash = 0;
  for (const char of id) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
  return (hash >>> 0) % 3;
}

export function createSceneryView(
  props: SurfaceProp[],
  origin: T.Vector3,
  kind: WorldKind,
) {
  const group = new T.Group();
  const palette = {
    ocean: ['#504b75', '#66a5b6'],
    desert: ['#996875', '#d49ba7'],
    ice: ['#637f95', '#a3dbe4'],
  }[kind];
  for (const shape of [
    'rock',
    'mineral',
    'fan',
    'succulent',
    'landmark',
    'gravel',
    'outcrop',
    'cliff',
  ] as const) {
    const mineral = shape === 'mineral';
    const extra =
      shape !== 'rock' &&
      shape !== 'mineral' &&
      shape !== 'gravel' &&
      shape !== 'outcrop';
    const variants = ['rock', 'landmark', 'outcrop', 'cliff'].includes(shape)
      ? 3
      : 1;
    for (let variant = 0; variant < variants; variant++) {
      const items = props.filter(
        (p) =>
          (rockFormation(p) ?? p.shape ?? (p.mineral ? 'mineral' : 'rock')) ===
            shape &&
          (variants === 1 || stoneVariant(p.id) === variant),
      );
      if (!items.length) continue;
      const geometry = mineral
        ? new T.ConeGeometry(1, 1, 5)
        : shape === 'gravel' || shape === 'outcrop' || shape === 'cliff'
          ? rockFormationGeometry(shape, variant)
          : explorationGeometry(shape, variant);
      if (mineral) geometry.translate(0, 0.4, 0);
      const material = new T.MeshStandardMaterial({
        color: '#ffffff',
        side: shape === 'fan' ? T.DoubleSide : T.FrontSide,
        roughness: mineral ? 0.48 : 0.95,
        metalness: mineral ? 0.12 : 0,
        flatShading: true,
        vertexColors: !mineral,
      });
      const mesh = new T.InstancedMesh(geometry, material, items.length),
        dummy = new T.Object3D();
      items.forEach((p, i) => {
        dummy.position.copy(p.point).sub(origin);
        dummy.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), p.normal);
        dummy.rotateY(p.yaw);
        dummy.scale.set(p.radius, p.height, p.radius * 0.85);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(
          i,
          (shape === 'fan'
            ? new T.Color()
            : new T.Color(
                p.tint ?? (extra ? '#ffffff' : palette[Number(mineral)]),
              )
          ).multiplyScalar(0.8 + (p.yaw / (Math.PI * 2)) * 0.24),
        );
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
  }
  return group;
}
