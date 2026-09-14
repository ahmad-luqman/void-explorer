import * as T from 'three';
import { explorationGeometry } from './scenery-geometry';
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
  for (const shape of [
    'rock',
    'mineral',
    'fan',
    'succulent',
    'landmark',
  ] as const) {
    const mineral = shape === 'mineral';
    const extra = shape !== 'rock' && shape !== 'mineral';
    const items = props.filter(
      (p) => (p.shape ?? (p.mineral ? 'mineral' : 'rock')) === shape,
    );
    if (!items.length) continue;
    const geometry = extra
      ? explorationGeometry(shape)
      : mineral
        ? new T.ConeGeometry(1, 1, 5)
        : new T.IcosahedronGeometry(1, 1);
    if (!extra && mineral) geometry.translate(0, 0.4, 0);
    if (shape === 'rock') {
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          y = p.getY(i),
          z = p.getZ(i);
        const r = 0.78 + 0.18 * Math.sin(x * 8 + z * 3 + y * 7) ** 2;
        p.setXYZ(i, x * r, (y + 1) * 0.5 * r, z * r);
      }
      geometry.computeVertexNormals();
    }
    const material = new T.MeshStandardMaterial({
      color: '#ffffff',
      side: shape === 'fan' ? T.DoubleSide : T.FrontSide,
      roughness: mineral ? 0.48 : 0.95,
      metalness: mineral ? 0.12 : 0,
      flatShading: true,
      vertexColors: extra,
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
  return group;
}
