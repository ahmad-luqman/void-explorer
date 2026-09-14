import { Quaternion, Vector3 } from 'three';
import type { Body } from './universe';

// A shared simulation clock keeps all worlds deterministic without wall-clock
// jumps on reload. Geometry and terrain seeds always live in the unturned frame.
export function rotationPeriod(body: Body) {
  return 1800 + (body.seed % 7) * 300;
}
export function rotationAxis(body: Body) {
  return new Vector3(0.12 + (body.seed % 5) * 0.03, 1, -0.18).normalize();
}
export function planetRotation(
  body: Body,
  time = body.rotationClock?.time ?? 0,
) {
  return new Quaternion().setFromAxisAngle(
    rotationAxis(body),
    body.star
      ? 0
      : ((time % rotationPeriod(body)) / rotationPeriod(body)) * Math.PI * 2,
  );
}
export function toPlanet(point: Vector3, body: Body) {
  return point
    .clone()
    .sub(body.position)
    .applyQuaternion(planetRotation(body).invert());
}
export function fromPlanet(point: Vector3, body: Body) {
  return point.clone().applyQuaternion(planetRotation(body)).add(body.position);
}
export function localDirection(direction: Vector3, body: Body) {
  return direction.clone().applyQuaternion(planetRotation(body).invert());
}
