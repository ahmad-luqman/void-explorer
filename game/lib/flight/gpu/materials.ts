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
  const p = N.fract(
    N.mod(point, 4096).mul(0.1031).add(seed.mul(0.001)),
  ).toVar();
  p.addAssign(N.dot(p, p.yzx.add(33.33)));
  return N.fract(p.x.add(p.y).mul(p.z));
});
const noise = N.Fn(([point, seed]: [Node<'vec3'>, Node<'float'>]) => {
  const i = point.floor(),
    f = N.smoothstep(0, 1, point.fract());
  const h = (x: number, y: number, z: number) =>
    hash(i.add(N.vec3(x, y, z)), seed);
  return N.mix(
    N.mix(
      N.mix(h(0, 0, 0), h(1, 0, 0), f.x),
      N.mix(h(0, 1, 0), h(1, 1, 0), f.x),
      f.y,
    ),
    N.mix(
      N.mix(h(0, 0, 1), h(1, 0, 1), f.x),
      N.mix(h(0, 1, 1), h(1, 1, 1), f.x),
      f.y,
    ),
    f.z,
  );
});
const stoneEdges = N.Fn(([point, seed]: [Node<'vec2'>, Node<'float'>]) => {
  const cell = point.floor(),
    f = point.fract();
  const first = N.float(10).toVar(),
    second = N.float(10).toVar();
  for (let y = -1; y <= 1; y++)
    for (let x = -1; x <= 1; x++) {
      const o = N.vec2(x, y),
        h = hash(N.vec3(cell.add(o), 17), seed);
      const delta = o
        .add(N.vec2(h.mul(17.13).fract(), h.mul(31.71).fract()).mul(0.7))
        .add(0.15)
        .sub(f);
      const distance = delta.dot(delta);
      second.assign(N.min(second, N.max(first, distance)));
      first.assign(N.min(first, distance));
    }
  return second.sqrt().sub(first.sqrt());
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
    const pixelWorld = N.dFdx(local).length().max(N.dFdy(local).length());
    const gravel = N.mix(
        0.5,
        hash(p.mul(7200).floor(), seed),
        N.smoothstep(0.2, 1.2, pixelWorld.mul(7200)).oneMinus(),
      ),
      stone = noise(
        local
          .mul(440)
          .add(
            N.uniform(
              new T.Vector3(
                (((anchor.x * 440) % 4096) + 4096) % 4096,
                (((anchor.y * 440) % 4096) + 4096) % 4096,
                (((anchor.z * 440) % 4096) + 4096) % 4096,
              ),
            ),
          ),
        seed,
      );
    const strata = height.mul(600).add(stone.mul(0.6)).sin().mul(0.5).add(0.5);
    const crackFilter = N.smoothstep(0.4, 1.8, pixelWorld.mul(1100)).oneMinus();
    const stoneLocal = local.xz
      .mul(440)
      .add(
        N.uniform(
          new T.Vector2(
            (((anchor.x * 440) % 4096) + 4096) % 4096,
            (((anchor.z * 440) % 4096) + 4096) % 4096,
          ),
        ),
      )
      .mul(2.5);
    const edge = stoneEdges(stoneLocal, seed);
    const cracks = N.mix(
      1,
      N.smoothstep(0.01, N.fwidth(edge).mul(1.5).add(0.03), edge),
      crackFilter.mul(N.smoothstep(0.3, 0.65, stone)),
    );
    const rawTone = stone
      .mul(0.14)
      .add(gravel.mul(0.04))
      .add(strata.mul(0.025))
      .add(0.83)
      .mul(N.mix(0.94, 1, cracks));
    const tone = N.mix(
      rawTone,
      0.94,
      N.smoothstep(0.06, 0.4, N.positionView.length()),
    );
    const mass = noise(p.mul(9), seed);
    const bedPhase = height
      .mul(38)
      .add(noise(p.mul(5), seed).mul(32))
      .add(noise(p.mul(23), seed).mul(6));
    const bedFilter = N.smoothstep(0.4, 2, N.fwidth(bedPhase)).oneMinus();
    const beds = bedPhase.sin().mul(bedFilter).mul(0.5).add(0.5);
    const geology = N.mix(
      N.vec3(0.91, 0.88, 0.96),
      N.vec3(1.03, 1.01, 0.98),
      N.mix(0.5, beds, N.smoothstep(0.4, 0.75, mass)),
    ).mul(N.mix(0.79, 1.14, mass));
    const grainFilter = N.smoothstep(
      0.3,
      1.5,
      N.dFdx(local).length().max(N.dFdy(local).length()).mul(440),
    ).oneMinus();
    const rockHeight = stone.mul(0.00006).mul(grainFilter);
    const sx = N.dFdx(N.positionView),
      sy = N.dFdy(N.positionView);
    const r1 = N.cross(sy, N.normalViewGeometry),
      r2 = N.cross(N.normalViewGeometry, sx);
    const det = sx.dot(r1);
    const grad = r1
      .mul(N.dFdx(rockHeight))
      .add(r2.mul(N.dFdy(rockHeight)))
      .mul(det.sign());
    const rockNormal = N.normalViewGeometry
      .mul(det.abs().max(1e-20))
      .sub(grad)
      .normalize();
    material.normalNode = N.mix(
      N.normalViewGeometry,
      rockNormal,
      wet.oneMinus(),
    ).normalize();
    material.colorNode = N.materialColor
      .mul(N.mix(geology.mul(tone), N.vec3(1), wet))
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
        .dot(N.vec3(943, 417, 729))
        .add(t.mul(0.65))
        .cos(),
      p
        .dot(N.vec3(-721, 1037, 513))
        .sub(t.mul(0.48))
        .cos(),
      p
        .dot(N.vec3(619, -831, 941))
        .add(t.mul(0.53))
        .sin(),
    );
    const tangent = wave.sub(radial.mul(wave.dot(radial)));
    const footprint = N.dFdx(p).length().max(N.dFdy(p).length()).mul(1500);
    const detail = N.smoothstep(1, 12, N.positionView.length())
      .oneMinus()
      .mul(N.smoothstep(0.3, 2, footprint).oneMinus());
    const swell = N.vec3(
      p
        .dot(N.vec3(17, 7, 13))
        .add(t.mul(0.18))
        .sin(),
      p
        .dot(N.vec3(-11, 19, 9))
        .sub(t.mul(0.13))
        .cos(),
      p
        .dot(N.vec3(13, -17, 21))
        .add(t.mul(0.16))
        .sin(),
    );
    const swellTangent = swell.sub(radial.mul(swell.dot(radial)));
    const swellDetail = N.smoothstep(
      0.3,
      2,
      N.dFdx(p).length().max(N.dFdy(p).length()).mul(35),
    ).oneMinus();
    const normal = N.modelViewMatrix
      .mul(
        N.vec4(
          radial
            .add(swellTangent.mul(0.025).mul(swellDetail))
            .add(tangent.mul(0.045).mul(detail)),
          0,
        ),
      )
      .xyz.normalize();
    material.normalNode = N.mix(
      (material.normalNode as Node<'vec3'> | null) ?? N.normalViewGeometry,
      normal,
      wet,
    ).normalize();
    // Compress only water highlights before fog and bloom; preserve shore color.
    const previousOutput = material.setupOutput.bind(material);
    material.setupOutput = (builder, result) => {
      const color = N.vec4(result as Node<'vec4'>),
        peak = N.max(N.max(color.r, color.g), color.b);
      return previousOutput(
        builder,
        N.vec4(N.mix(color.rgb, color.rgb.div(peak.add(1)), wet), color.a),
      );
    };
    material.roughnessNode = N.mix(
      (material.roughnessNode as Node<'float'> | null) ?? N.materialRoughness,
      bands.mul(0.08).add(0.32),
      wet,
    );
  }
  return material;
}
