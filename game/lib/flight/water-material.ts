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
      `uniform vec3 waterAnchor; uniform float waterRadius; attribute float terrainHeight; varying float vTerrainHeight;
      varying mat3 vWaterFrame; varying vec3 vWaterPosition; varying vec3 vWaterLocal; varying float vWaterMask;\n` +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vTerrainHeight=terrainHeight;
       vWaterFrame=mat3(modelViewMatrix);
       vWaterPosition=position+waterAnchor; vWaterLocal=position;
       vWaterMask=1.-smoothstep(.0002,.001,length(vWaterPosition)-waterRadius);`,
    );
    shader.fragmentShader =
      `uniform float waterTime; uniform float waterRadius; varying float vTerrainHeight;
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
       float depth=max(0.,-vTerrainHeight);
       float offshore=smoothstep(.002,.08,depth);
       vec3 waterColor=mix(vec3(.035,.32,.27),vec3(.006,.105,.155),offshore);
       waterColor*=.91+ripples.a*.18;
       float shallow=1.-smoothstep(.003,.018,depth);
       float phase=depth*560.+waterTime*1.5+ripples.a*1.7;
       float phaseFilter=1.-smoothstep(.5,3.,fwidth(phase));
       float breaker=smoothstep(.68,.98,sin(phase))*phaseFilter;
       float wash=(1.-smoothstep(.0005,.003,depth))*(.25+.35*ripples.a);
       float foam=clamp(shallow*(breaker*.7+wash),0.,.85);
       waterColor=mix(waterColor,vec3(.58,.78,.70),foam);
       diffuseColor.rgb=mix(diffuseColor.rgb,waterColor,wetWater);
      `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
       roughnessFactor=mix(roughnessFactor,.24+swell.a*.12,wetWater);`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
       vec3 wave=ripples.xyz*.22+swell.xyz*.035;
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
  material.customProgramCacheKey = () => cacheKey + '-water-depth-v6';
}
