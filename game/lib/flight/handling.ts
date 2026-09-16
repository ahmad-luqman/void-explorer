import { Quaternion, Vector3 } from 'three';

/** Exponential response; independent of the number of display frames. */
export const response = (rate: number, dt: number) =>
  -Math.expm1(-rate * Math.max(0, dt));

export function steerFlight(
  orientation: Quaternion,
  velocity: Vector3,
  input: { pitch: number; yaw: number; roll: number; brake: boolean },
  dt: number,
) {
  const clamp = (n: number) =>
    Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : 0;
  const target = new Vector3(
    clamp(input.pitch),
    clamp(input.yaw),
    clamp(input.roll) * 1.5,
  );
  const rate = target.lengthSq() > 0 ? 10 : input.brake ? 22 : 16;
  const blend = response(rate, dt);
  // Integrate the exponential velocity analytically. Using the end velocity
  // for the whole frame would make low-refresh displays turn farther.
  const rotation = target
    .clone()
    .multiplyScalar(dt)
    .addScaledVector(velocity.clone().sub(target), blend / rate);
  velocity.lerp(target, blend);
  const angle = rotation.length();
  if (angle > 1e-12)
    orientation
      .multiply(
        new Quaternion().setFromAxisAngle(rotation.divideScalar(angle), angle),
      )
      .normalize();
}

export function flightFieldOfView(
  speed: number,
  title: boolean,
  walking: boolean,
) {
  if (title) return 58;
  if (walking) return 60;
  return 60 + Math.min(17, Math.log1p(Math.max(0, speed) / 140) * 3.4);
}
