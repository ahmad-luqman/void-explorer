import * as T from 'three';
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial } from 'three/webgpu';
import * as N from 'three/tsl';
import type { Node } from 'three/webgpu';
import { createShader as sky } from './sky.js';
import { createShader as halo } from './halo.js';
import { createShader as atmosphere } from './atmosphere.js';
import { createShader as ring } from './ring.js';
import { createShader as cloud } from './cloud.js';
import type { Body } from '../universe';

type Value<T> = { value: T };
export type TerrainRecipe = {
  mask?: {
    contactCenter: Value<T.Vector3>;
    contactRadius: Value<number>;
    center: Value<T.Vector3>;
    cos: Value<number>;
    patch: boolean;
  };
  contact?: { up: T.Vector3; radius: number };
  water?: { body: Body; anchor: T.Vector3; time: Value<number> };
  ground?: { body: Body; anchor: T.Vector3 };
};
const hash = N.Fn(([point, seed]: [Node<'vec3'>, Node<'float'>]) => {
  const p = N.fract(point.mul(0.1031).add(seed.mul(0.001))).toVar();
  p.addAssign(N.dot(p, p.yzx.add(33.33)));
  return N.fract(p.x.add(p.y).mul(p.z));
});
export function convertMaterial(source: T.Material): T.Material {
  if (source instanceof T.ShaderMaterial) {
    const material = new MeshBasicNodeMaterial().copy(source);
    // Existing simulation uniforms stay live; node references read their current values.
    Object.assign(material, { uniforms: source.uniforms });
    const u = source.uniforms;
    if (u.air) material.fragmentNode = sky(u)(N.positionLocal);
    else if (u.coverage)
      material.fragmentNode = cloud(u)(
        N.positionLocal.normalize(),
        N.positionView,
      );
    else if (u.secondaryDirection)
      material.fragmentNode = atmosphere(u)(
        N.positionLocal.normalize(),
        N.normalView,
        N.positionView,
      );
    else if (u.color)
      material.fragmentNode = halo(u)(N.normalView, N.positionView);
    else material.fragmentNode = ring(u)(N.uv());
    return material;
  }
  const spec: TerrainRecipe | undefined = source.userData.flightTerrain;
  if (!spec || !(source instanceof T.MeshStandardMaterial)) return source;
  const material = new MeshStandardNodeMaterial().copy(source);
  const local = N.positionLocal;
  if (spec.mask) {
    const center = N.reference('value', 'vec3', spec.mask.contactCenter);
    const radius = N.reference('value', 'float', spec.mask.contactRadius);
    const up = center.div(center.length().max(0.000001)),
      delta = local.sub(center),
      along = delta.dot(up);
    const clip = N.reference('value', 'vec3', spec.mask.center);
    const cos = N.reference('value', 'float', spec.mask.cos);
    const alignment = local.normalize().dot(clip);
    const withinClip = spec.mask.patch
      ? alignment.greaterThanEqual(cos)
      : alignment.lessThanEqual(cos);
    material.maskNode = withinClip.and(
      radius
        .lessThanEqual(0)
        .or(along.abs().greaterThanEqual(radius.mul(2)))
        .or(delta.sub(up.mul(along)).length().greaterThanEqual(radius)),
    );
  }
  if (spec.contact) {
    const up = N.uniform(spec.contact.up);
    material.maskNode = local
      .sub(up.mul(local.dot(up)))
      .length()
      .lessThanEqual(spec.contact.radius);
  }
  if (spec.ground) {
    const { body, anchor } = spec.ground;
    const p = local.add(N.uniform(anchor.clone()));
    const height = p.length().sub(body.radius);
    const wet = N.float(body.kind === 'ocean' ? 1 : 0).mul(
      N.smoothstep(0.0002, 0.001, height).oneMinus(),
    );
    const seed = N.float(body.seed % 997);
    const gravel = hash(p.mul(7200).floor(), seed),
      stone = hash(p.mul(440).floor(), seed);
    const strata = height.mul(600).add(stone.mul(0.6)).sin().mul(0.5).add(0.5);
    const rawTone = stone
      .mul(0.22)
      .add(gravel.mul(0.14))
      .add(strata.mul(0.18))
      .add(0.65);
    const tone = N.mix(
      rawTone,
      0.94,
      N.smoothstep(0.06, 0.4, N.positionView.length()),
    );
    material.colorNode = N.materialColor
      .mul(N.mix(tone, 1, wet))
      .mul(N.mix(N.vec3(1), N.vec3(0.8, 1.06, 1.13), wet.mul(0.3)));
    material.roughnessNode = N.mix(0.95, 0.3, wet);
  }
  if (spec.water) {
    const { body, anchor, time } = spec.water;
    const p = local.add(N.uniform(anchor.clone()));
    // Preserve the vertex water mask: interpolated sphere chords sit below sea level.
    const wet = N.varying(
      N.smoothstep(0.0002, 0.001, p.length().sub(body.radius)).oneMinus(),
    ).clamp();
    const t = N.reference('value', 'float', time),
      radial = p.normalize();
    const bands = p
      .dot(N.vec3(183, 57, 129))
      .add(t.mul(0.85))
      .add(p.dot(N.vec3(51, -73, 91)).sin())
      .sin()
      .mul(0.5)
      .add(0.5);
    const shore = wet
      .mul(wet.oneMinus())
      .mul(2)
      .mul(N.smoothstep(0.35, 0.85, bands))
      .mul(N.smoothstep(0.0002, 0.001, p.length().sub(body.radius)).oneMinus());
    const baseColor =
      (material.colorNode as Node<'vec3'> | null) ?? N.materialColor;
    material.colorNode = N.mix(
      baseColor.mul(N.mix(1, bands.mul(0.12).add(0.94), wet)),
      N.vec3(0.62, 0.83, 0.79),
      shore,
    );
    const wave = N.vec3(
      p
        .dot(N.vec3(43, 17, 29))
        .add(t.mul(0.65))
        .cos(),
      p
        .dot(N.vec3(-21, 37, 13))
        .sub(t.mul(0.48))
        .cos(),
      p
        .dot(N.vec3(19, -31, 41))
        .add(t.mul(0.53))
        .sin(),
    );
    const tangent = wave.sub(radial.mul(wave.dot(radial)));
    const detail = N.smoothstep(1, 12, N.positionView.length()).oneMinus();
    const normal = N.modelViewMatrix
      .mul(N.vec4(radial.add(tangent.mul(0.13).mul(detail)), 0))
      .xyz.normalize();
    material.normalNode = N.mix(N.normalViewGeometry, normal, wet).normalize();
    material.roughnessNode = N.mix(
      (material.roughnessNode as Node<'float'> | null) ?? N.materialRoughness,
      0.26,
      wet,
    );
  }
  return material;
}
