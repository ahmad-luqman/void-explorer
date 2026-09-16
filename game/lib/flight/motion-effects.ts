import * as T from 'three';
import { random } from './universe';
import { response } from './handling';

export type MotionInput = {
  elapsed: number;
  speed: number;
  density: number;
  pulse: boolean;
  active: boolean;
  orientation: T.Quaternion;
  angularVelocity: T.Vector3;
};

export function motionProfile(speed: number, density: number, pulse: boolean) {
  const air = T.MathUtils.clamp(density, 0, 1);
  const near = T.MathUtils.smoothstep(speed, 0.025, 0.7);
  const cruise = T.MathUtils.smoothstep(speed, 30, 1100);
  const warp = pulse ? T.MathUtils.smoothstep(speed, 500, 24000) : 0;
  return {
    opacity: T.MathUtils.lerp(cruise * 0.28 + warp * 0.22, near * 0.23, air),
    extent: T.MathUtils.lerp(180, 0.3, air),
    length: T.MathUtils.lerp(
      0.006 + cruise * 0.035 + warp * 0.12,
      0.025 + near * 0.07,
      air,
    ),
    rate: T.MathUtils.lerp(
      0.12 + cruise * 0.65 + warp,
      Math.min(2.5, speed * 2),
      air,
    ),
    vapor: air * air * T.MathUtils.smoothstep(speed, 0.07, 0.65),
  };
}

/** Camera-relative geometry; one line draw and one 192-triangle vapor draw. */
export class MotionEffects {
  group = new T.Group();
  private positions = new Float32Array(180 * 6);
  private colors = new Float32Array(180 * 8);
  private seeds: number[][] = [];
  private phase = 0;
  private elapsed: number | undefined;
  private opacity = 0;
  private vaporOpacity = 0;
  private vaporPositions = new Float32Array(2 * 25 * 3 * 3);
  private lines: T.LineSegments<T.BufferGeometry, T.LineBasicMaterial>;
  private vapor: T.Mesh<T.BufferGeometry, T.MeshBasicMaterial>;
  private point = new T.Vector3();
  stats = { streaks: 0, vapor: 0, phase: 0 };

  constructor() {
    const rng = random(921);
    for (let i = 0; i < 180; i++) {
      const angle = rng() * Math.PI * 2;
      // A clear axial corridor keeps the destination and ship silhouette legible.
      const radius = 0.14 + rng() * 0.8;
      this.seeds.push([
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        rng(),
      ]);
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      'position',
      new T.BufferAttribute(this.positions, 3).setUsage(T.DynamicDrawUsage),
    );
    geometry.setAttribute(
      'color',
      new T.BufferAttribute(this.colors, 4).setUsage(T.DynamicDrawUsage),
    );
    this.lines = new T.LineSegments(
      geometry,
      new T.LineBasicMaterial({
        color: '#a0dce6',
        vertexColors: true,
        transparent: true,
        opacity: 0,
        blending: T.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    this.lines.frustumCulled = false;
    this.group.add(this.lines);

    const vaporGeometry = new T.BufferGeometry();
    const color = new Float32Array(2 * 25 * 3 * 4);
    const indices: number[] = [];
    for (let wing = 0; wing < 2; wing++) {
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        for (let edge = 0; edge < 3; edge++)
          color.set(
            [
              0.75,
              0.9,
              1,
              (edge === 1 ? 1 : 0) * Math.sin(Math.PI * t) * (1 - t),
            ],
            (wing * 75 + i * 3 + edge) * 4,
          );
        if (i < 24) {
          const a = wing * 75 + i * 3;
          for (let edge = 0; edge < 2; edge++)
            indices.push(
              a + edge,
              a + edge + 1,
              a + edge + 3,
              a + edge + 1,
              a + edge + 4,
              a + edge + 3,
            );
        }
      }
    }
    vaporGeometry.setAttribute(
      'position',
      new T.BufferAttribute(this.vaporPositions, 3).setUsage(
        T.DynamicDrawUsage,
      ),
    );
    vaporGeometry.setAttribute('color', new T.BufferAttribute(color, 4));
    vaporGeometry.setIndex(indices);
    this.vapor = new T.Mesh(
      vaporGeometry,
      new T.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        side: T.DoubleSide,
        depthWrite: false,
        fog: true,
      }),
    );
    this.vapor.frustumCulled = false;
    this.group.add(this.vapor);
  }

  update(input: MotionInput, low: boolean) {
    const delta = this.elapsed === undefined ? 0 : input.elapsed - this.elapsed;
    const reset = delta < 0 || delta > 0.25;
    const dt = reset ? 0 : Math.max(0, delta);
    this.elapsed = input.elapsed;
    if (reset || !input.active) {
      this.phase = 0;
      this.opacity = 0;
      this.vaporOpacity = 0;
    }
    this.group.visible = input.active;
    if (!input.active) {
      this.stats = { streaks: 0, vapor: 0, phase: this.phase };
      return;
    }
    const profile = motionProfile(input.speed, input.density, input.pulse);
    this.phase = (this.phase + profile.rate * dt) % 1;
    this.opacity += (profile.opacity - this.opacity) * response(5, dt);
    const turn = Math.min(1, input.angularVelocity.length());
    this.vaporOpacity +=
      (profile.vapor * (0.24 + turn * 0.2) - this.vaporOpacity) *
      response(5, dt);
    this.lines.material.opacity = this.opacity;
    this.lines.visible = this.opacity > 0.001;
    const count = low ? 90 : 180;
    this.lines.geometry.setDrawRange(0, count * 2);
    for (let i = 0; i < count; i++) {
      const [x, y, seed] = this.seeds[i];
      const z = (seed - this.phase + 1) % 1;
      const fade =
        T.MathUtils.smoothstep(z, 0, 0.12) *
        (1 - T.MathUtils.smoothstep(z, 0.8, 1));
      for (let end = 0; end < 2; end++) {
        this.point
          .set(
            x * profile.extent,
            y * profile.extent,
            -(0.06 + z + end * profile.length) * profile.extent,
          )
          .applyQuaternion(input.orientation)
          .toArray(this.positions, i * 6 + end * 3);
        this.colors.set([1, 1, 1, fade * (end ? 0.05 : 1)], i * 8 + end * 4);
      }
    }
    this.lines.geometry.attributes.position.needsUpdate = true;
    this.lines.geometry.attributes.color.needsUpdate = true;
    this.vapor.visible = this.vaporOpacity > 0.001;
    this.vapor.material.opacity = this.vaporOpacity;
    for (let wing = 0; wing < 2; wing++) {
      const side = wing ? 1 : -1;
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const width = (0.0001 + Math.sin(t * Math.PI) * 0.0006) * (1 - t * 0.7);
        const trail = t * (0.012 + profile.vapor * 0.016);
        for (let edge = 0; edge < 3; edge++) {
          this.point
            .set(
              side * (0.0141 + t * t * 0.003) +
                (edge - 1) * width +
                input.angularVelocity.y * trail * t * 0.1,
              -0.001 +
                Math.sin(t * 8 - input.elapsed * 3) * t * 0.0004 -
                input.angularVelocity.x * trail * t * 0.1,
              0.007 + trail,
            )
            .applyQuaternion(input.orientation)
            .toArray(this.vaporPositions, (wing * 75 + i * 3 + edge) * 3);
        }
      }
    }
    this.vapor.geometry.attributes.position.needsUpdate = true;
    this.stats = {
      streaks: this.opacity,
      vapor: this.vaporOpacity,
      phase: this.phase,
    };
  }
}
