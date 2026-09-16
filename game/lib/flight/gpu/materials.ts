import * as T from 'three';
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial } from 'three/webgpu';
import * as N from 'three/tsl';
import type { Node } from 'three/webgpu';
import { createShader as sky } from './sky.js';
import { createShader as halo } from './halo.js';
import { createShader as atmosphere } from './atmosphere.js';
import { createShader as ring } from './ring.js';
import { createShader as cloud } from './cloud.js';
import {
  groundTexture,
  groundTextureAnchor,
  GROUND_TEXTURE_SCALE,
} from '../ground-texture';
import {
  groundAlbedo,
  groundAlbedoAnchor,
  GROUND_ALBEDO_SCALE,
} from '../ground-albedo';
import type { Body } from '../universe';
import {
  waterTexture,
  waterTextureAnchor,
  WATER_DETAIL_SCALE,
  WATER_SWELL_SCALE,
} from '../water-texture';

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
const sampleGround = N.Fn(([point, normal]: [Node<'vec3'>, Node<'vec3'>]) => {
  const weight = normal.normalize().abs().pow(4).toVar();
  weight.divAssign(weight.x.add(weight.y).add(weight.z).max(0.0001));
  return N.texture(groundTexture(), point.yz)
    .mul(weight.x)
    .add(N.texture(groundTexture(), point.xz).mul(weight.y))
    .add(N.texture(groundTexture(), point.xy).mul(weight.z));
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
    const stone = noise(
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
    const groundSample = sampleGround(
      local
        .mul(GROUND_TEXTURE_SCALE)
        .add(N.uniform(groundTextureAnchor(anchor))),
      N.normalLocal,
    );
    const albedo = groundAlbedo();
    const albedoReady = N.reference('value', 'float', albedo.ready);
    const sampleAlbedo = N.Fn(
      ([point, normal]: [Node<'vec3'>, Node<'vec3'>]) => {
        const weight = normal.normalize().abs().pow(4).toVar();
        weight.divAssign(weight.x.add(weight.y).add(weight.z).max(0.0001));
        return N.texture(albedo.texture, point.yz)
          .rgb.mul(weight.x)
          .add(N.texture(albedo.texture, point.xz).rgb.mul(weight.y))
          .add(N.texture(albedo.texture, point.xy).rgb.mul(weight.z));
      },
    );
    const slate = sampleAlbedo(
      local.mul(GROUND_ALBEDO_SCALE).add(N.uniform(groundAlbedoAnchor(anchor))),
      N.normalLocal,
    );
    const tone = N.mix(
      groundSample.rgb.mul(1.5),
      slate.mul(3.5).add(0.25),
      albedoReady,
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
      N.dFdx(local).length().max(N.dFdy(local).length()).mul(160),
    ).oneMinus();
    const rockHeight = N.mix(
      groundSample.a,
      slate.dot(N.vec3(0.3333)),
      albedoReady,
    )
      .mul(0.000025)
      .add(stone.mul(0.000005))
      .mul(grainFilter);
    const interpolatedNormal = N.varying(
      N.modelViewMatrix.mul(N.vec4(N.normalLocal, 0)).xyz,
    ).normalize();
    const surfaceNormal = N.mix(
      N.normalViewGeometry,
      interpolatedNormal,
      N.varying(N.attribute('surfaceSmooth', 'float')),
    ).normalize();
    const sx = N.dFdx(N.positionView),
      sy = N.dFdy(N.positionView);
    const r1 = N.cross(sy, surfaceNormal),
      r2 = N.cross(surfaceNormal, sx);
    const det = sx.dot(r1);
    const grad = r1
      .mul(N.dFdx(rockHeight))
      .add(r2.mul(N.dFdy(rockHeight)))
      .mul(det.sign());
    const rockNormal = surfaceNormal
      .mul(det.abs().max(1e-20))
      .sub(grad)
      .normalize();
    material.normalNode = N.mix(
      surfaceNormal,
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
    const wet = N.smoothstep(
      0.35,
      0.85,
      N.varying(
        N.smoothstep(0.0002, 0.001, p.length().sub(body.radius)).oneMinus(),
      ).clamp(),
    );
    const t = N.reference('value', 'float', time),
      radial = p.normalize();
    const sampleWaves = N.Fn(
      ([point, up, flow]: [Node<'vec3'>, Node<'vec3'>, Node<'vec2'>]) => {
        const weight = up.abs().div(up.abs().x.add(up.abs().y).add(up.abs().z));
        const x = N.texture(waterTexture(), point.yz.add(flow)).rgb,
          y = N.texture(waterTexture(), point.xz.add(flow.yx)).rgb,
          z = N.texture(waterTexture(), point.xy.sub(flow)).rgb;
        const slope = N.vec3(0, x.r.mul(2).sub(1), x.g.mul(2).sub(1))
          .mul(weight.x)
          .add(N.vec3(y.r.mul(2).sub(1), 0, y.g.mul(2).sub(1)).mul(weight.y))
          .add(N.vec3(z.r.mul(2).sub(1), z.g.mul(2).sub(1), 0).mul(weight.z));
        return N.vec4(slope, N.vec3(x.b, y.b, z.b).dot(weight));
      },
    );
    const ripples = sampleWaves(
      local
        .mul(WATER_DETAIL_SCALE)
        .add(N.uniform(waterTextureAnchor(anchor, WATER_DETAIL_SCALE))),
      radial,
      N.vec2(t.mul(0.009), t.mul(-0.006)),
    );
    const swell = sampleWaves(
      local
        .mul(WATER_SWELL_SCALE)
        .add(N.uniform(waterTextureAnchor(anchor, WATER_SWELL_SCALE))),
      radial,
      N.vec2(t.mul(0.0007), t.mul(0.0004)),
    );
    const depth = N.varying(N.attribute('terrainHeight', 'float'))
      .negate()
      .max(0);
    const offshore = N.smoothstep(0.002, 0.08, depth);
    const waterColor = N.mix(
      N.vec3(0.035, 0.32, 0.27),
      N.vec3(0.006, 0.105, 0.155),
      offshore,
    ).mul(ripples.w.mul(0.18).add(0.91));
    const shallow = N.smoothstep(0.003, 0.018, depth).oneMinus();
    const phase = depth.mul(560).add(t.mul(1.5)).add(ripples.w.mul(1.7));
    const phaseFilter = N.smoothstep(0.5, 3, N.fwidth(phase)).oneMinus();
    const breaker = N.smoothstep(0.68, 0.98, phase.sin()).mul(phaseFilter);
    const wash = N.smoothstep(0.0005, 0.003, depth)
      .oneMinus()
      .mul(ripples.w.mul(0.35).add(0.25));
    const foam = shallow.mul(breaker.mul(0.7).add(wash)).clamp(0, 0.85);
    const baseColor =
      (material.colorNode as Node<'vec3'> | null) ?? N.materialColor;
    // GLSL replaces diffuse color after vertex color multiplication. NodeMaterial
    // normally multiplies it afterwards; apply vertex colors only to dry terrain
    // here so the ocean palette and foam are not darkened a second time.
    const terrainColor = source.vertexColors
      ? baseColor.mul(N.vertexColor().rgb)
      : baseColor;
    material.vertexColors = false;
    material.colorNode = N.mix(
      terrainColor,
      N.mix(waterColor, N.vec3(0.58, 0.78, 0.7), foam),
      wet,
    );
    const wave = ripples.xyz.mul(0.22).add(swell.xyz.mul(0.035));
    const tangent = wave.sub(radial.mul(wave.dot(radial)));
    const normal = N.modelViewMatrix
      .mul(N.vec4(radial.add(tangent), 0))
      .xyz.normalize();
    const previousSpecular = material.setupSpecular.bind(material);
    material.setupSpecular = () => {
      previousSpecular();
      const strength = N.mix(1, 0.28, wet);
      N.specularColor.assign(N.specularColor.mul(strength));
      N.specularColorBlended.assign(N.specularColorBlended.mul(strength));
      N.specularF90.mulAssign(N.mix(1, 0.45, wet));
    };
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
      swell.w.mul(0.12).add(0.24),
      wet,
    );
  }
  return material;
}
