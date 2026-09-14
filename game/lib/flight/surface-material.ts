import { MeshStandardMaterial, Vector3 } from 'three';
import type { Body } from './universe';

// World-anchored mineral/gravel variation adds scale without changing contact
// heights or invalidating existing landed saves. All detail is procedural.
export function addSurfaceMaterial(
  material: MeshStandardMaterial,
  body: Body,
  anchor: Vector3,
) {
  (material.userData.flightTerrain ??= {}).ground = { body, anchor };
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.surfaceAnchor = {
      value: anchor.clone().sub(body.position),
    };
    shader.uniforms.planetRadius = { value: body.radius };
    shader.uniforms.oceanWorld = { value: body.kind === 'ocean' ? 1 : 0 };
    shader.uniforms.mineralSeed = { value: body.seed % 997 };
    shader.fragmentShader =
      `uniform vec3 surfaceAnchor;uniform float planetRadius;uniform float oceanWorld;uniform float mineralSeed;
  float mineralHash(vec3 p){p=fract(p*.1031+mineralSeed*.001);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
  ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
  vec3 mineralPosition=vContactLocal+surfaceAnchor;
  float seaHeight=length(mineralPosition)-planetRadius;
  float wet=oceanWorld*(1.-smoothstep(.0002,.001,seaHeight));
  float gravel=mineralHash(floor(mineralPosition*1200.));
  float stone=mineralHash(floor(mineralPosition*95.));
  float strata=.5+.5*sin(seaHeight*210.+stone*1.8);
  float groundTone=.87+.10*stone+.10*gravel+.055*strata;
  diffuseColor.rgb*=mix(groundTone,1.,wet);
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.8,1.06,1.13),wet*.3);
  `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
  roughnessFactor=mix(.95,.3,wet);
  `,
    );
  };
  material.customProgramCacheKey = () => 'surface-minerals-v1';
}
