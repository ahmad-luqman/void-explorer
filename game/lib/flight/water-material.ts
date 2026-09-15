import { MeshStandardMaterial, Vector3 } from 'three';
import {
  waterTexture,
  waterTextureAnchor,
  WATER_DETAIL_SCALE,
  WATER_SWELL_SCALE,
} from './water-texture';
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
    shader.uniforms.waveTexture = { value: waterTexture() };
    shader.uniforms.waterDetailAnchor = {
      value: waterTextureAnchor(anchor, WATER_DETAIL_SCALE),
    };
    shader.uniforms.waterSwellAnchor = {
      value: waterTextureAnchor(anchor, WATER_SWELL_SCALE),
    };
    shader.vertexShader =
      `uniform vec3 waterAnchor; uniform float waterRadius;
      varying mat3 vWaterFrame; varying vec3 vWaterPosition; varying vec3 vWaterLocal; varying float vWaterMask;\n` +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vWaterFrame=mat3(modelViewMatrix);
       vWaterPosition=position+waterAnchor; vWaterLocal=position;
       vWaterMask=1.-smoothstep(.0002,.001,length(vWaterPosition)-waterRadius);`,
    );
    shader.fragmentShader =
      `uniform float waterTime; uniform float waterRadius;
      uniform sampler2D waveTexture;uniform vec3 waterDetailAnchor;uniform vec3 waterSwellAnchor;
      vec4 sampleWaves(vec3 p,vec3 radial,vec2 flow){
        vec3 weights=abs(radial);weights/=weights.x+weights.y+weights.z;
        vec3 x=texture2D(waveTexture,p.yz+flow).rgb;
        vec3 y=texture2D(waveTexture,p.xz+flow.yx).rgb;
        vec3 z=texture2D(waveTexture,p.xy-flow).rgb;
        vec3 slope=vec3(0.,x.r*2.-1.,x.g*2.-1.)*weights.x
          +vec3(y.r*2.-1.,0.,y.g*2.-1.)*weights.y
          +vec3(z.r*2.-1.,z.g*2.-1.,0.)*weights.z;
        return vec4(slope,dot(vec3(x.b,y.b,z.b),weights));
      }
      varying mat3 vWaterFrame; varying vec3 vWaterPosition; varying vec3 vWaterLocal; varying float vWaterMask;\n` +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       vec3 radial=normalize(vWaterPosition);
       vec4 ripples=sampleWaves(vWaterLocal*12.+waterDetailAnchor,radial,vec2(waterTime*.009,waterTime*-.006));
       vec4 swell=sampleWaves(vWaterLocal*.37+waterSwellAnchor,radial,vec2(waterTime*.0007,waterTime*.0004));
       float wetWater=smoothstep(.35,.85,clamp(vWaterMask,0.,1.));
       float shore=wetWater*(1.-wetWater)*4.*(.25+ripples.a*.2);
       diffuseColor.rgb*=mix(1.,.97+ripples.a*.06,wetWater);
       diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.075,.34,.30),shore);
      `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
       roughnessFactor=mix(roughnessFactor,.26+swell.a*.06,wetWater);`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
       vec3 wave=ripples.xyz*.10+swell.xyz*.018;
       wave-=radial*dot(wave,radial);
       vec3 waterNormal=normalize(vWaterFrame*(radial+wave));
       normal=normalize(mix(normal,waterNormal,wetWater));`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_physical_fragment>',
      `#include <lights_physical_fragment>
       float waterSpecular=mix(1.,.28,wetWater);
       material.specularColor*=waterSpecular;
       material.specularColorBlended*=waterSpecular;
       material.specularF90*=mix(1.,.45,wetWater);`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float waterHighlight=max(max(outgoingLight.r,outgoingLight.g),outgoingLight.b);
       outgoingLight=mix(outgoingLight,outgoingLight/(1.+waterHighlight),wetWater);
       #include <opaque_fragment>`,
    );
  };
  material.customProgramCacheKey = () => cacheKey + '-water-v5';
}
