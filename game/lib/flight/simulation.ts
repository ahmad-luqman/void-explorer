import { Matrix4, Quaternion, Vector3 } from 'three';
import {
  planetRotation,
  rotationAxis,
  rotationPeriod,
  toPlanet,
} from './rotation';
import {
  address,
  translate,
  validAddress,
  zeroCells,
  type Cells,
  type SpaceAddress,
} from './coordinates';
import { COAST_UP, COAST_FORWARD, COAST_TIME } from './coast';
import { surfaceRadius } from './universe';
import { SurfaceExpedition } from './surface';
import { flightClearance } from './flight-clearance';
import {
  type Body,
  type System,
  createUniverse,
  nearestSystem,
  placeUniverse,
  worldSurfaceRadius,
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
  origin: Cells = zeroCells();
  originRevision = 0;
  position = new Vector3(0, 420, 2680);
  orientation = new Quaternion();
  speed = 0;
  throttle = 0;
  pulse = false;
  autopilot = false;
  descending = false;
  elapsed = 0;
  terrainVersion: 1 | 2 | 3 = 3;
  rotationClock = { time: 0 };
  activeSystem: System = this.systems[0];
  target: Body = this.systems[0].planets[0];
  nearest: Body = this.target;
  altitude = 0;
  visited = new Set([0]);
  status = 'CRUISE';
  flightMessage = '';
  groundClearance = 0;
  surface = new SurfaceExpedition(this);
  constructor() {
    for (const system of this.systems)
      for (const body of system.planets)
        body.rotationClock = this.rotationClock;
    this.setTerrainVersion(3);
    this.face(this.target.position);
    this.updateEnvironment();
  }
  setTerrainVersion(version: 1 | 2 | 3) {
    this.terrainVersion = version;
    for (const system of this.systems)
      for (const body of system.planets) body.terrainVersion = version;
  }
  startCoast() {
    this.reset();
    this.rotationClock.time = COAST_TIME;
    this.elapsed = COAST_TIME;
    this.position
      .copy(this.target.position)
      .addScaledVector(COAST_UP, surfaceRadius(COAST_UP, this.target) + 0.12);
    this.orientation.setFromRotationMatrix(
      new Matrix4().lookAt(
        this.position,
        this.position
          .clone()
          .add(COAST_FORWARD)
          .addScaledVector(COAST_UP, -0.15),
        COAST_UP,
      ),
    );
    const rotation = planetRotation(this.target);
    this.position
      .sub(this.target.position)
      .applyQuaternion(rotation)
      .add(this.target.position);
    this.orientation.premultiply(rotation);
    this.updateEnvironment();
  }
  get address(): SpaceAddress {
    return address(this.origin, this.position);
  }
  setAddress(at: SpaceAddress) {
    this.origin = [...at.cells];
    this.position.fromArray(at.offset);
    placeUniverse(this.systems, this.origin);
    this.originRevision++;
  }
  private moveBy(delta: Vector3) {
    const local = this.position.clone().add(delta);
    if (
      local.length() < 2_000_000 &&
      validAddress(address(this.origin, local))
    ) {
      this.position.copy(local);
      return true;
    }
    const next = translate(this.address, delta);
    if (!validAddress(next)) {
      this.speed = 0;
      this.throttle = 0;
      this.pulse = false;
      this.autopilot = false;
      this.descending = false;
      this.flightMessage =
        'Survey range limit. Turn back toward the charted systems.';
      return false;
    }
    this.setAddress(next);
    // Rebasing happens only in flight, far beyond contact range. Native terrain
    // remains reusable; discard world-space transient surface references.
    this.surface.reset();
    return true;
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
    if (this.surface.phase !== 'flight') return;
    this.autopilot = !this.autopilot;
    this.descending = false;
  }
  descend() {
    if (this.surface.phase !== 'flight') return;
    if (this.target.star) return;
    this.autopilot = true;
    this.descending = true;
    this.pulse = false;
  }
  reset() {
    this.setTerrainVersion(3);
    this.surface.reset();
    this.elapsed = 0;
    this.rotationClock.time = 0;
    this.flightMessage = '';
    this.setAddress(address(zeroCells(), new Vector3(0, 420, 2680)));
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
      const d =
        direction.length() - worldSurfaceRadius(direction.normalize(), b);
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
    if (dt === 0) return;
    // A restoring expedition must wait at its saved phase while workers catch up.
    if (this.surface.phase !== 'restoring') {
      const oldTime = this.rotationClock.time;
      this.elapsed += dt;
      this.rotationClock.time += dt;
      const body = this.nearest;
      const attached = this.surface.phase !== 'flight';
      const coupling = attached
        ? 1
        : Math.max(0, Math.min(1, (260 - this.altitude) / 130));
      if (!body.star) {
        const delta = planetRotation(body).multiply(
          planetRotation(body, oldTime).invert(),
        );
        this.surface.rotateWith(body, delta, attached || coupling === 1);
        if (!attached && coupling > 0 && coupling < 1) {
          const drift = new Quaternion().setFromAxisAngle(
            rotationAxis(body),
            ((dt * Math.PI * 2) / rotationPeriod(body)) * coupling,
          );
          this.position
            .sub(body.position)
            .applyQuaternion(drift)
            .add(body.position);
          this.orientation.premultiply(drift).normalize();
        }
      }
    }
    this.updateEnvironment();
    this.surface.refreshScenery();
    if (this.surface.phase !== 'flight') {
      this.surface.step(dt, input);
      this.updateEnvironment();
      return;
    }
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
    const localClearance = flightClearance(
      this.position,
      this.nearest,
      this.surface.patch,
      this.surface.scenery,
    );
    this.groundClearance = localClearance.distance;
    const clearance = Math.max(
      0,
      Math.min(this.altitude, localClearance.distance),
    );
    // Cap travel by clearance; no loading or teleportation at atmosphere boundaries.
    const maxSpeed = Math.min(
      this.pulse
        ? Math.min(5e12, 24000 + Math.max(0, clearance - 30000) * 0.7)
        : input.boost
          ? 1400
          : 280,
      Math.max(0.004, clearance * 0.7),
    );
    let desired = this.throttle * maxSpeed;
    if (this.autopilot) {
      const radial = this.position
        .clone()
        .sub(this.target.position)
        .normalize();
      const stop = this.target.star
        ? this.target.radius * 2.8
        : worldSurfaceRadius(radial, this.target) +
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
    const direction = FORWARD.clone().applyQuaternion(this.orientation);
    const clearanceAt = (point: Vector3) => {
      const system = nearestSystem(point, this.systems);
      let closest = { distance: Infinity, reason: '' };
      for (const body of [
        system.star,
        ...system.planets,
        ...(system.companion ? [system.companion] : []),
      ]) {
        const result = flightClearance(
          point,
          body,
          this.surface.patch,
          this.surface.scenery,
        );
        if (result.distance < closest.distance) closest = result;
      }
      return closest;
    };
    let remaining = this.speed * dt;
    let current = clearanceAt(this.position);
    while (remaining > 1e-9) {
      // Shrink from 20 km in space to 5 m near obstacles. Never continue the
      // old travel vector after a collision, even with residual pulse speed.
      const travel = Math.min(
        remaining,
        Math.max(
          20,
          (this.position.distanceTo(
            nearestSystem(this.position, this.systems).position,
          ) -
            50000) *
            0.5,
        ),
        Math.max(0.005, current.distance * 0.25),
      );
      const next = this.position.clone().addScaledVector(direction, travel);
      const candidate = clearanceAt(next);
      if (candidate.distance < 0 && candidate.distance <= current.distance) {
        // Keep the final position on the safe side without snapping the ship
        // up a slope. Old low-flight saves may escape an envelope they start inside.
        if (current.distance >= 0) {
          let lo = 0,
            hi = travel;
          for (let j = 0; j < 16; j++) {
            const mid = (lo + hi) / 2;
            if (
              clearanceAt(this.position.clone().addScaledVector(direction, mid))
                .distance >= 0
            )
              lo = mid;
            else hi = mid;
          }
          this.position.addScaledVector(direction, lo);
        }
        this.speed = 0;
        this.throttle = 0;
        this.autopilot = false;
        this.descending = false;
        this.pulse = false;
        this.flightMessage = candidate.reason;
        break;
      }
      if (!this.moveBy(direction.clone().multiplyScalar(travel))) break;
      current = candidate;
      remaining -= travel;
      this.flightMessage = '';
    }
    this.groundClearance = clearanceAt(this.position).distance;
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
      address: this.address,
      originRevision: this.originRevision,
      rotationTime: this.rotationClock.time,
      planetRotation: planetRotation(this.nearest).toArray(),
      surfacePosition: toPlanet(this.position, this.nearest).toArray(),
      surfaceShipPosition: toPlanet(
        this.surface.shipPosition,
        this.nearest,
      ).toArray(),
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
      surfacePhase: this.surface.phase,
      shipPosition: this.surface.shipPosition.toArray(),
      shipDistance: this.surface.shipDistance,
      walked: this.surface.walked,
      contactReady: !!this.surface.patch,
      surfaceMessage: this.surface.message,
      flightMessage: this.flightMessage,
      groundClearance: this.groundClearance,
    };
  }
}
