import { Object3D, Quaternion, Vector3 } from 'three';

const HINGE_AXIS = new Vector3(1, 0, 0);
// Both the authored skeleton and the fallback expose the same rigid joints.
// Rest transforms are the deployed pose; counter-rotation keeps the pads level.
export function bindLandingGear(root: Object3D) {
  const joints = ['Left', 'Right', 'Nose'].flatMap((leg) =>
    ['Hinge', 'Pad'].map((part) => {
      const joint = root.getObjectByName(`Gear_${leg}_${part}`);
      if (!joint) throw new Error(`Missing landing gear joint: ${leg} ${part}`);
      return {
        joint,
        rest: joint.quaternion.clone(),
        sign: part === 'Hinge' ? 1 : -1,
      };
    }),
  );
  const rotation = new Quaternion();
  return (deployment: number) => {
    const t = Math.max(0, Math.min(1, deployment));
    const angle = -((1 - t * t * (3 - 2 * t)) * Math.PI) / 2;
    for (const { joint, rest, sign } of joints)
      joint.quaternion
        .copy(rest)
        .multiply(rotation.setFromAxisAngle(HINGE_AXIS, angle * sign));
  };
}
