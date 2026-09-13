import * as T from 'three';
import type { SurfaceProp } from './scenery';
import type { WorldKind } from './universe';

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
  for (const mineral of [false, true]) {
    const items = props.filter((p) => p.mineral === mineral);
    if (!items.length) continue;
    const geometry = mineral
      ? new T.ConeGeometry(1, 1, 5)
      : new T.IcosahedronGeometry(1, 0);
    geometry.translate(0, mineral ? 0.4 : 0.75, 0);
    const material = new T.MeshStandardMaterial({
      color: palette[Number(mineral)],
      roughness: mineral ? 0.48 : 0.95,
      metalness: mineral ? 0.12 : 0,
      flatShading: true,
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
        new T.Color().setScalar(0.8 + (p.yaw / (Math.PI * 2)) * 0.24),
      );
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}
