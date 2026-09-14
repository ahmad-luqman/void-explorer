import { Matrix4, Quaternion, Vector3 } from 'three';
import {
  BOARD_DISTANCE,
  ContactSurface,
  EYE_HEIGHT,
  GEAR_HEIGHT,
  SHIP_SCALE,
  type GroundSample,
} from './contact';
import { sampleBiome } from './biomes';
import { toPlanet, planetRotation } from './rotation';
import { COAST_UP, COAST_FORWARD, COAST_RIGHT } from './coast';
import type { Body } from './universe';
import type { FlightSimulation, Controls } from './simulation';
import {
  generateScenery,
  sceneryBlocks,
  sceneryApproachBlocked,
  type SurfaceProp,
} from './scenery';
export type SurfacePhase =
  | 'flight'
  | 'landing'
  | 'landed'
  | 'walking'
  | 'takeoff'
  | 'restoring';
export type SurfaceRecord = {
  phase: 'flight' | 'landed' | 'walking';
  bodyId: string | null;
  shipPosition: number[];
  shipOrientation: number[];
  walked: number;
  sceneryVersion?: 1 | 2;
  sceneryClearings?: { point: number[]; radius: number }[];
};
const FORWARD = new Vector3(0, 0, -1),
  RIGHT = new Vector3(1, 0, 0);
export class SurfaceExpedition {
  phase: SurfacePhase = 'flight';
  patch: ContactSurface | null = null;
  message = '';
  bodyId: string | null = null;
  shipPosition = new Vector3();
  shipOrientation = new Quaternion();
  walked = 0;
  landings = 0;
  scenery: SurfaceProp[] = [];
  private sceneryAnchor = new Vector3(Infinity, Infinity, Infinity);
  private sceneryExclusions: { point: Vector3; radius: number }[] = [];
  private destination = new Vector3();
  private landingOrientation = new Quaternion();
  private lift = 0;
  private restoreRecord: SurfaceRecord | null = null;
  constructor(private sim: FlightSimulation) {}
  // Transport world-space API values together; geometry remains in its native
  // frame. In particular, never regenerate scenery just because its planet turns.
  rotateWith(body: Body, delta: Quaternion, pilot: boolean) {
    const rotate = (point: Vector3) =>
      point.sub(body.position).applyQuaternion(delta).add(body.position);
    if (pilot) {
      rotate(this.sim.position);
      this.sim.orientation.premultiply(delta).normalize();
    }
    if (this.bodyId === body.id) {
      rotate(this.shipPosition);
      this.shipOrientation.premultiply(delta).normalize();
      rotate(this.destination);
      this.landingOrientation.premultiply(delta).normalize();
      for (const exclusion of this.sceneryExclusions) rotate(exclusion.point);
    }
    if (this.patch?.body.id === body.id) {
      if (Number.isFinite(this.sceneryAnchor.x)) rotate(this.sceneryAnchor);
      for (const prop of this.scenery) {
        rotate(prop.point);
        prop.normal.applyQuaternion(delta);
      }
      this.patch.syncRotation();
    }
  }
  get survey() {
    const body = this.patch?.body;
    if (!body || body.id !== this.sim.nearest.id)
      return { biome: '', landmark: null, coast: false };
    const biome = sampleBiome(
      toPlanet(this.sim.position, body).normalize(),
      body,
    ).name;
    const prop = this.scenery
      .filter((p) => p.landmark)
      .sort(
        (a, b) =>
          a.point.distanceToSquared(this.sim.position) -
          b.point.distanceToSquared(this.sim.position),
      )[0];
    return {
      biome,
      coast:
        body.id === 'p0-0' &&
        (body.terrainVersion ?? 1) >= 2 &&
        toPlanet(this.sim.position, body).normalize().distanceTo(COAST_UP) *
          body.radius <
          1.5,
      landmark: prop
        ? {
            id: prop.id,
            name: prop.landmark!,
            distance: prop.point.distanceTo(this.sim.position),
          }
        : null,
    };
  }
  lookOverBay() {
    if (this.phase !== 'walking' || !this.patch || !this.survey.coast) return;
    const direction = COAST_FORWARD.clone()
      .addScaledVector(COAST_RIGHT, 0.65)
      .normalize()
      .applyQuaternion(planetRotation(this.patch.body));
    this.sim.orientation.setFromRotationMatrix(
      new Matrix4().lookAt(
        this.sim.position,
        this.sim.position
          .clone()
          .add(direction)
          .addScaledVector(this.patch.up, -0.12),
        this.patch.up,
      ),
    );
  }
  lookAtLandmark() {
    if (this.phase !== 'walking' || !this.patch) return;
    const selected = this.survey.landmark;
    const prop = this.scenery.find((p) => p.id === selected?.id);
    if (!prop) return;
    const target = prop.point
      .clone()
      .addScaledVector(prop.normal, prop.height * 0.18);
    this.sim.orientation.setFromRotationMatrix(
      new Matrix4().lookAt(this.sim.position, target, this.patch.up),
    );
  }
  get shipDistance() {
    return this.sim.position.distanceTo(this.shipPosition);
  }
  setPatch(patch: ContactSurface) {
    if ((this.phase === 'landing' || this.phase === 'landed') && this.patch)
      return;
    patch.body.rotationClock = this.sim.rotationClock;
    patch.syncRotation();
    this.patch = patch;
    this.refreshScenery(true);
    if (this.phase === 'restoring' && this.restoreRecord) {
      const ground = patch.sample(this.sim.position);
      if (!ground) return;
      const record = this.restoreRecord;
      this.phase = record.phase;
      this.restoreRecord = null;
      if (this.phase === 'walking')
        this.sim.position
          .copy(ground.point)
          .addScaledVector(patch.up, EYE_HEIGHT);
      this.sim.status =
        this.phase === 'walking'
          ? 'ON FOOT'
          : this.phase === 'flight'
            ? 'ATMOSPHERE'
            : 'LANDED';
      this.message = 'Expedition restored.';
    }
  }
  refreshScenery(force = false) {
    const patch = this.patch;
    if (!patch || patch.body.id !== this.sim.nearest.id) return;
    if (!force && this.phase === 'flight' && this.sim.altitude > 3) return;
    const delta = this.sim.position.clone().sub(this.sceneryAnchor);
    delta.addScaledVector(patch.up, -delta.dot(patch.up));
    if (!force && delta.length() < 0.15) return;
    this.scenery = generateScenery(patch, this.sim.position).filter(
      (prop) =>
        !this.sceneryExclusions.some(
          (e) =>
            prop.point.distanceTo(e.point) <
            e.radius +
              prop.radius +
              prop.height *
                2 *
                Math.sqrt(Math.max(0, 1 - prop.normal.dot(patch.up) ** 2)),
        ),
    );
    this.sceneryAnchor.copy(this.sim.position);
  }
  private stance(at = this.sim.position): {
    ground: GroundSample;
    orientation: Quaternion;
    position: Vector3;
  } | null {
    const patch = this.patch;
    if (
      !patch ||
      patch.body.id !== this.sim.nearest.id ||
      !patch.contains(at)
    ) {
      this.message = 'Mapping the landing surface…';
      return null;
    }
    const ground = patch.sample(at);
    if (!ground) {
      this.message = 'Move over mapped terrain.';
      return null;
    }
    if (ground.water) {
      this.message = 'Water below. Find solid ground before landing.';
      return null;
    }
    if (ground.slope > 12) {
      this.message = 'Slope too steep. Find a flatter landing site.';
      return null;
    }
    if (sceneryBlocks(this.scenery, ground.point, patch.up, 0.035)) {
      this.message =
        'Obstacles near the landing footprint. Find an open clearing.';
      return null;
    }
    const forward = FORWARD.clone().applyQuaternion(this.sim.orientation);
    forward.addScaledVector(ground.normal, -forward.dot(ground.normal));
    if (forward.lengthSq() < 0.01) forward.copy(patch.north);
    forward.normalize();
    const orientation = new Quaternion().setFromRotationMatrix(
      new Matrix4().lookAt(
        ground.point,
        ground.point.clone().add(forward),
        ground.normal,
      ),
    );
    const position = ground.point
      .clone()
      .addScaledVector(ground.normal, GEAR_HEIGHT);
    for (const [x, z] of [
      [-0.85, 1],
      [0.85, 1],
      [0, -1.3],
    ]) {
      const foot = new Vector3(x * SHIP_SCALE, -GEAR_HEIGHT, z * SHIP_SCALE)
          .applyQuaternion(orientation)
          .add(position),
        sample = patch.sample(foot);
      if (
        !sample ||
        sample.water ||
        sample.slope > 12 ||
        Math.abs(sample.point.clone().sub(foot).dot(ground.normal)) > 0.0006
      ) {
        this.message = 'Landing gear needs an even, dry surface.';
        return null;
      }
    }
    if (sceneryApproachBlocked(this.scenery, this.sim.position, position)) {
      this.message =
        'Obstacles near the landing approach. Find an open clearing.';
      return null;
    }
    return { ground, orientation, position };
  }
  land() {
    if (this.phase !== 'flight') return false;
    this.sim.flightMessage = '';
    this.sim.updateEnvironment();
    if (this.sim.nearest.star || this.sim.altitude > 30) {
      this.message = 'Descend below 30 km to begin landing.';
      return false;
    }
    if (this.sim.speed > 20) {
      this.message = 'Brake below 20 km/s before landing.';
      return false;
    }
    this.refreshScenery(true);
    let site = this.stance();
    let adjusted = false;
    if (!site && this.message.startsWith('Obstacles near') && this.patch) {
      // Choose a nearby dry, level opening before starting the final approach.
      for (const radius of [0.06, 0.1, 0.16]) {
        for (let i = 0; i < 12 && !site; i++) {
          const angle = (i * Math.PI) / 6;
          site = this.stance(
            this.sim.position
              .clone()
              .addScaledVector(this.patch.east, Math.cos(angle) * radius)
              .addScaledVector(this.patch.north, Math.sin(angle) * radius),
          );
        }
        if (site) {
          adjusted = true;
          break;
        }
      }
    }
    if (!site) return false;
    this.bodyId = this.sim.nearest.id;
    this.destination.copy(site.position);
    this.landingOrientation.copy(site.orientation);
    this.phase = 'landing';
    this.sim.autopilot = false;
    this.sim.descending = false;
    this.sim.pulse = false;
    this.sim.throttle = 0;
    this.message = adjusted
      ? 'Clear ground located nearby. Adjusting final approach.'
      : 'Landing gear deployed. Beginning final approach.';
    return true;
  }
  exit() {
    if (this.phase !== 'landed' || !this.patch) return false;
    for (const side of [1, -1]) {
      const candidate = this.shipPosition
        .clone()
        .addScaledVector(
          RIGHT.clone().applyQuaternion(this.shipOrientation),
          side * 0.027,
        );
      const ground = this.patch.sample(candidate);
      if (
        !ground ||
        ground.water ||
        ground.slope > 32 ||
        sceneryBlocks(this.scenery, ground.point, this.patch.up, 0.0007)
      )
        continue;
      this.sim.position
        .copy(ground.point)
        .addScaledVector(this.patch.up, EYE_HEIGHT);
      this.sim.orientation.setFromRotationMatrix(
        new Matrix4().lookAt(
          this.sim.position,
          this.shipPosition,
          this.patch.up,
        ),
      );
      this.phase = 'walking';
      this.sim.status = 'ON FOOT';
      this.message =
        'Surface excursion started. AURORA remains at the landing site.';
      return true;
    }
    this.message = 'No safe exit beside the ship.';
    return false;
  }
  board() {
    if (this.phase !== 'walking') return false;
    if (this.shipDistance > BOARD_DISTANCE) {
      this.message = 'Move within 55 m of AURORA to board.';
      return false;
    }
    this.sim.position.copy(this.shipPosition);
    this.sim.orientation.copy(this.shipOrientation);
    this.sim.speed = 0;
    this.phase = 'landed';
    this.sim.status = 'LANDED';
    this.message = 'Welcome aboard. Ready for takeoff.';
    return true;
  }
  takeoff() {
    if (this.phase !== 'landed') return false;
    this.phase = 'takeoff';
    this.lift = 0;
    this.message = 'Vertical ascent. Flight controls return at 120 m.';
    return true;
  }
  reset() {
    this.phase = 'flight';
    this.shipPosition.set(0, 0, 0);
    this.shipOrientation.identity();
    this.patch = null;
    this.bodyId = null;
    this.message = '';
    this.restoreRecord = null;
    this.walked = 0;
    this.scenery = [];
    this.sceneryExclusions = [];
    this.sceneryAnchor.set(Infinity, Infinity, Infinity);
  }
  record(): SurfaceRecord {
    return {
      phase:
        this.phase === 'walking'
          ? 'walking'
          : this.phase === 'landed'
            ? 'landed'
            : 'flight',
      bodyId: this.bodyId,
      shipPosition: this.shipPosition.toArray(),
      shipOrientation: this.shipOrientation.toArray(),
      walked: this.walked,
      sceneryVersion: 2,
      sceneryClearings: this.sceneryExclusions.map((e) => ({
        point: e.point.toArray(),
        radius: e.radius,
      })),
    };
  }
  restore(record: SurfaceRecord, waitForGround = false) {
    this.reset();
    this.shipPosition.fromArray(record.shipPosition);
    this.shipOrientation.fromArray(record.shipOrientation);
    this.walked = record.walked;
    this.bodyId = record.bodyId;
    if (record.sceneryVersion === 2) {
      this.sceneryExclusions = (record.sceneryClearings ?? []).map((e) => ({
        point: new Vector3().fromArray(e.point),
        radius: e.radius,
      }));
    } else if (record.phase !== 'flight') {
      // New scenery must not obstruct an older saved ship, exit, or walking pose.
      this.sceneryExclusions = [
        { point: this.shipPosition.clone(), radius: 0.04 },
        { point: this.sim.position.clone(), radius: 0.004 },
      ];
    }
    if (record.phase !== 'flight' || waitForGround) {
      this.phase = 'restoring';
      this.restoreRecord = record;
      this.message = 'Restoring ground contact…';
    }
  }
  step(dt: number, input: Controls) {
    const s = this.sim;
    if (this.phase === 'restoring') {
      s.speed = 0;
      s.status = 'RESTORING';
      return;
    }
    if (this.phase === 'landed') {
      s.speed = 0;
      s.status = 'LANDED';
      return;
    }
    if (this.phase === 'landing') {
      const delta = this.destination.clone().sub(s.position),
        distance = delta.length();
      const move = Math.min(
        distance,
        Math.min(40, Math.max(0.0005, distance * 2)) * dt,
      );
      if (distance > 0) s.position.addScaledVector(delta, move / distance);
      s.speed = move / dt;
      s.orientation.slerp(this.landingOrientation, 1 - Math.exp(-dt * 5));
      s.status = 'LANDING';
      if (distance < 0.00002) {
        s.position.copy(this.destination);
        s.orientation.copy(this.landingOrientation);
        s.speed = 0;
        this.shipPosition.copy(s.position);
        this.shipOrientation.copy(s.orientation);
        this.phase = 'landed';
        this.landings++;
        s.status = 'LANDED';
        this.message = 'Touchdown confirmed. Surface access available.';
      }
      return;
    }
    if (this.phase === 'takeoff') {
      const up = this.patch?.up || new Vector3(0, 1, 0),
        rise = Math.min(0.12 - this.lift, 0.055 * dt);
      s.position.addScaledVector(up, rise);
      this.lift += rise;
      s.speed = rise / dt;
      s.status = 'TAKEOFF';
      if (this.lift >= 0.11999) {
        this.phase = 'flight';
        s.speed = 0;
        const forward = FORWARD.clone()
          .applyQuaternion(s.orientation)
          .addScaledVector(up, 0.15)
          .normalize();
        s.orientation.setFromRotationMatrix(
          new Matrix4().lookAt(s.position, s.position.clone().add(forward), up),
        );
        this.message = 'Ascent complete. Flight controls released.';
      }
      return;
    }
    if (this.phase !== 'walking' || !this.patch) return;
    const patch = this.patch,
      up = patch.up;
    s.orientation.premultiply(
      new Quaternion().setFromAxisAngle(up, input.yaw * dt * 1.4),
    );
    const pitchRotation = new Quaternion().setFromAxisAngle(
      RIGHT,
      input.pitch * dt,
    );
    const next = s.orientation.clone().multiply(pitchRotation);
    if (Math.abs(FORWARD.clone().applyQuaternion(next).dot(up)) < 0.94)
      s.orientation.copy(next);
    const forward = FORWARD.clone().applyQuaternion(s.orientation);
    forward.addScaledVector(up, -forward.dot(up)).normalize();
    const right = new Vector3().crossVectors(forward, up).normalize();
    const direction = forward
      .multiplyScalar(Number(input.accelerate) - Number(input.decelerate))
      .addScaledVector(right, input.strafe || 0);
    if (direction.lengthSq() > 1) direction.normalize();
    const distance = (input.boost ? 0.007 : 0.004) * dt;
    const candidate = s.position.clone().addScaledVector(direction, distance);
    const local = candidate
      .clone()
      .sub(this.shipPosition)
      .applyQuaternion(this.shipOrientation.clone().invert());
    if (Math.abs(local.x) < 0.015 && Math.abs(local.z) < 0.011) {
      s.speed = 0;
      this.message = 'AURORA is here. Press F to board.';
      return;
    }
    const ground = patch.sample(candidate);
    if (!ground) {
      s.speed = 0;
      this.message = 'Mapping the next ground patch…';
      return;
    }
    if (ground.water || ground.slope > 35) {
      s.speed = 0;
      this.message = ground.water
        ? 'Water ahead. Stay on solid ground.'
        : 'Slope ahead is too steep to walk.';
      return;
    }
    if (sceneryBlocks(this.scenery, ground.point, up, 0.0007)) {
      s.speed = 0;
      this.message = 'Surface obstacle ahead. Walk around it.';
      return;
    }
    const before = s.position.clone();
    s.position.copy(ground.point).addScaledVector(up, EYE_HEIGHT);
    const walked = before.distanceTo(s.position);
    this.walked += walked;
    s.speed = walked / dt;
    s.status = 'ON FOOT';
    if (direction.lengthSq() > 0.01)
      this.message =
        'Surface excursion · ' + Math.round(this.walked * 1000) + ' m walked';
  }
}
