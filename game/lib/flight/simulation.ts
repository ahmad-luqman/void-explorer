import { Matrix4, Quaternion, Vector3 } from 'three';
import { SurfaceExpedition } from './surface';
import { GEAR_HEIGHT } from './contact';
import {
  type Body,
  type System,
  createUniverse,
  nearestSystem,
  surfaceRadius,
} from './universe';

export type Controls = {
  pitch: number;
  yaw: number;
  roll: number;
  accelerate: boolean;
  decelerate: boolean;
  brake: boolean;
  boost: boolean;
  strafe?: number;
};
export const emptyControls = (): Controls => ({
  pitch: 0,
  yaw: 0,
  roll: 0,
  accelerate: false,
  decelerate: false,
  brake: false,
  boost: false,
});
const FORWARD = new Vector3(0, 0, -1),
  UP = new Vector3(0, 1, 0);
export class FlightSimulation {
  systems = createUniverse();
  position = new Vector3(0, 420, 2680);
  orientation = new Quaternion();
  speed = 0;
  throttle = 0;
  pulse = false;
  autopilot = false;
  descending = false;
  elapsed = 0;
  activeSystem: System = this.systems[0];
  target: Body = this.systems[0].planets[0];
  nearest: Body = this.target;
  altitude = 0;
  visited = new Set([0]);
  status = 'CRUISE';
  surface = new SurfaceExpedition(this);
  constructor() {
    this.face(this.target.position);
    this.updateEnvironment();
  }
  face(point: Vector3) {
    this.orientation.setFromRotationMatrix(
      new Matrix4().lookAt(this.position, point, UP),
    );
  }
  select(id: string) {
    for (const s of this.systems) {
      const b =
        s.star.id === id
          ? s.star
          : s.companion?.id === id
            ? s.companion
            : s.planets.find((p) => p.id === id);
      if (b) {
        this.target = b;
        this.autopilot = false;
        this.descending = false;
        return true;
      }
    }
    return false;
  }
  engage() {
    if(this.surface.phase!=='flight')return;
    this.autopilot = !this.autopilot;
    this.descending = false;
  }
  descend() {
    if(this.surface.phase!=='flight')return;
    if (this.target.star) return;
    this.autopilot = true;
    this.descending = true;
    this.pulse = false;
  }
  reset() {
    this.surface.reset();
    this.position.set(0, 420, 2680);
    this.speed = 0;
    this.throttle = 0;
    this.pulse = false;
    this.autopilot = false;
    this.descending = false;
    this.target = this.systems[0].planets[0];
    this.face(this.target.position);
    this.updateEnvironment();
  }
  updateEnvironment() {
    this.activeSystem = nearestSystem(this.position, this.systems);
    // Home planet is farther from its sun, so include it even near system boundaries.
    const candidates = [
      ...this.activeSystem.planets,
      this.activeSystem.star,
      ...(this.activeSystem.companion ? [this.activeSystem.companion] : []),
    ];
    let distance = Infinity;
    for (const b of candidates) {
      const direction = this.position.clone().sub(b.position);
      const d = direction.length() - surfaceRadius(direction.normalize(), b);
      if (d < distance) {
        distance = d;
        this.nearest = b;
      }
    }
    this.altitude = distance;
    if (this.position.distanceTo(this.activeSystem.position) < 30000)
      this.visited.add(this.activeSystem.id);
  }
  step(dt: number, input: Controls) {
    dt = Math.min(Math.max(dt, 0), 1 / 20);
    this.elapsed += dt;
    this.updateEnvironment();
    if(this.surface.phase!=='flight'){this.surface.step(dt,input);this.updateEnvironment();return;}
    const manual =
      Math.abs(input.pitch) + Math.abs(input.yaw) + Math.abs(input.roll) > 0.01;
    if (manual || input.brake || input.accelerate || input.decelerate) {
      this.autopilot = false;
      this.descending = false;
    }
    if (manual) {
      const turn = 1.0 * dt;
      this.orientation.multiply(
        new Quaternion().setFromAxisAngle(
          new Vector3(1, 0, 0),
          input.pitch * turn,
        ),
      );
      this.orientation.multiply(
        new Quaternion().setFromAxisAngle(UP, input.yaw * turn),
      );
      this.orientation.multiply(
        new Quaternion().setFromAxisAngle(
          new Vector3(0, 0, 1),
          input.roll * turn * 1.5,
        ),
      );
      this.orientation.normalize();
    }
    this.throttle = Math.max(
      0,
      Math.min(
        1,
        this.throttle +
          (Number(input.accelerate) - Number(input.decelerate)) * dt * 0.5,
      ),
    );
    const clearance = Math.max(0, this.altitude);
    // Cap travel by clearance; no loading or teleportation at atmosphere boundaries.
    const maxSpeed = Math.min(
      this.pulse ? 24000 : input.boost ? 1400 : 280,
      Math.max(.004, clearance * 0.7),
    );
    let desired = this.throttle * maxSpeed;
    if (this.autopilot) {
      const radial = this.position
        .clone()
        .sub(this.target.position)
        .normalize();
      const stop = this.target.star
        ? this.target.radius * 2.8
        : surfaceRadius(radial, this.target) +
          (this.descending ? 12 : Math.max(180, this.target.radius * 0.65));
      const remaining = this.position.distanceTo(this.target.position) - stop;
      if (remaining < 2) {
        desired = 0;
        this.throttle = 0;
        this.autopilot = false;
        if (this.descending) {
          const tangent = new Vector3(0, 1, 0)
            .addScaledVector(radial, -radial.y)
            .normalize();
          if (tangent.lengthSq() < 0.01) tangent.set(1, 0, 0);
          const horizon = this.position
            .clone()
            .addScaledVector(tangent, 100)
            .addScaledVector(radial, -18);
          this.orientation.setFromRotationMatrix(
            new Matrix4().lookAt(this.position, horizon, radial),
          );
        }
        this.descending = false;
      } else {
        // Steer around intervening worlds instead of flying a straight line
        // through the planet the expedition is leaving.
        let waypoint = this.target.position.clone();
        const direction = waypoint.clone().sub(this.position).normalize();
        let firstObstacle = Infinity;
        for (const body of [
          this.activeSystem.star,
          ...this.activeSystem.planets,
          ...(this.activeSystem.companion ? [this.activeSystem.companion] : []),
        ]) {
          if (body.id === this.target.id) continue;
          const toBody = body.position.clone().sub(this.position);
          const along = toBody.dot(direction);
          const safeRadius = body.radius * 1.35 + 100;
          const side = toBody.clone().addScaledVector(direction, -along);
          if (
            along > 0 &&
            along < remaining &&
            along < firstObstacle &&
            side.length() < safeRadius
          ) {
            firstObstacle = along;
            side.negate();
            if (side.lengthSq() < 1) side.crossVectors(direction, UP);
            if (side.lengthSq() < 0.01) side.set(1, 0, 0);
            waypoint = body.position
              .clone()
              .addScaledVector(side.normalize(), safeRadius * 1.7);
          }
        }
        const rotation = new Quaternion().setFromRotationMatrix(
          new Matrix4().lookAt(this.position, waypoint, UP),
        );
        this.orientation.slerp(rotation, 1 - Math.exp(-dt * 2));
        const alignment = FORWARD.clone()
          .applyQuaternion(this.orientation)
          .dot(waypoint.sub(this.position).normalize());
        desired =
          Math.min(maxSpeed, remaining * 0.65) * Math.max(0, alignment) ** 6;
      }
    }
    if (input.brake) {
      desired = 0;
      this.throttle = 0;
      this.pulse = false;
    }
    this.speed +=
      (desired - this.speed) * (1 - Math.exp(-dt * (input.brake ? 9 : 2.5)));
    // Substep travel to prevent tunneling at high speed, including bodies beside the route.
    const steps = Math.max(1, Math.ceil((this.speed * dt) / 20));
    const move = FORWARD.clone()
      .applyQuaternion(this.orientation)
      .multiplyScalar((this.speed * dt) / steps);
    const solids = [
      this.activeSystem.star,
      ...this.activeSystem.planets,
      ...(this.activeSystem.companion ? [this.activeSystem.companion] : []),
    ];
    for (let i = 0; i < steps; i++) {
      this.position.add(move);
      for (const b of solids) {
        const radial = this.position.clone().sub(b.position),
          d = radial.length();
        radial.normalize();
        const contact=this.surface.patch?.body.id===b.id?this.surface.patch.sample(this.position):null;
        const floor = contact ? contact.point.distanceTo(b.position)+GEAR_HEIGHT : surfaceRadius(radial, b) + (b.star ? 180 : 5);
        if (d < floor) {
          this.position.copy(b.position).addScaledVector(radial, floor);
          this.speed = 0;
          this.throttle = 0;
          this.autopilot = false;
          break;
        }
      }
    }
    this.updateEnvironment();
    this.status =
      this.altitude < 130 && !this.nearest.star
        ? 'ATMOSPHERE'
        : this.pulse && this.speed > 500
          ? 'PULSE'
          : input.boost && this.speed > 100
            ? 'BOOST'
            : 'CRUISE';
  }
  snapshot() {
    return {
      position: this.position.toArray(),
      orientation: this.orientation.toArray(),
      speed: this.speed,
      throttle: this.throttle,
      altitude: this.altitude,
      status: this.status,
      target: this.target.id,
      system: this.activeSystem.id,
      autopilot: this.autopilot,
      descending: this.descending,
      pulse: this.pulse,
      visited: [...this.visited],
      surfacePhase:this.surface.phase,
      shipPosition:this.surface.shipPosition.toArray(),
      shipDistance:this.surface.shipDistance,
      walked:this.surface.walked,
      contactReady:!!this.surface.patch,
      surfaceMessage:this.surface.message,
    };
  }
}
