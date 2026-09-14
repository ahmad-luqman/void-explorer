import { MeshStandardMaterial, Vector3 } from 'three';
import type { Body } from './universe';

// Normal-only waves retain the exact render/collision surface and coast line.
// Shared planet-relative phases keep globe, patch and walking mesh in agreement.
export function addWaterMaterial(
  material: MeshStandardMaterial,
  body: Body,
  anchor: Vector3,
  time: { value: number },
) {
  if (body.kind !== 'ocean') return;
  (material.userData.flightTerrain ??= {}).water = { body, anchor, time };
  const previous = material.onBeforeCompile.bind(material);
  const cacheKey = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
    shader.uniforms.waterAnchor = { value: anchor.clone() };
    shader.uniforms.waterRadius = { value: body.radius };
    shader.uniforms.waterTime = time;
    shader.vertexShader =
      `uniform vec3 waterAnchor; uniform float waterRadius;
      varying mat3 vWaterFrame; varying vec3 vWaterPosition; varying float vWaterMask;\n` +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vWaterFrame=mat3(modelViewMatrix);
       vWaterPosition=position+waterAnchor;
       vWaterMask=1.-smoothstep(.0002,.001,length(vWaterPosition)-waterRadius);`,
    );
    shader.fragmentShader =
      `uniform float waterTime;
      varying mat3 vWaterFrame; varying vec3 vWaterPosition; varying float vWaterMask;\n` +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
       roughnessFactor=mix(roughnessFactor,.26,clamp(vWaterMask,0.,1.));`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
       vec3 radial=normalize(vWaterPosition);
       vec3 wave=vec3(cos(dot(vWaterPosition,vec3(43.,17.,29.))+waterTime*.65),
         cos(dot(vWaterPosition,vec3(-21.,37.,13.))-waterTime*.48),
         sin(dot(vWaterPosition,vec3(19.,-31.,41.))+waterTime*.53));
       wave-=radial*dot(wave,radial);
       float waveDetail=1.-smoothstep(1.,12.,length(vViewPosition));
       vec3 waterNormal=normalize((vWaterFrame*(radial+wave*.13*waveDetail)));
       normal=normalize(mix(normal,waterNormal,clamp(vWaterMask,0.,1.)));`,
    );
  };
  material.customProgramCacheKey = () => cacheKey + '-water-v1';
}
