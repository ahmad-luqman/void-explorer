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
  const previous = material.onBeforeCompile.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
    shader.uniforms.surfaceAnchor = {
      value: anchor.clone(),
    };
    shader.uniforms.surfaceDetailAnchor = {
      value: anchor
        .clone()
        .multiplyScalar(440)
        .set(
          (((anchor.x * 440) % 4096) + 4096) % 4096,
          (((anchor.y * 440) % 4096) + 4096) % 4096,
          (((anchor.z * 440) % 4096) + 4096) % 4096,
        ),
    };
    shader.uniforms.planetRadius = { value: body.radius };
    shader.uniforms.oceanWorld = { value: body.kind === 'ocean' ? 1 : 0 };
    shader.uniforms.mineralSeed = { value: body.seed % 997 };
    shader.fragmentShader =
      `uniform vec3 surfaceAnchor;uniform vec3 surfaceDetailAnchor;uniform float planetRadius;uniform float oceanWorld;uniform float mineralSeed;
  float mineralHash(vec3 p){p=mod(p,4096.);p=fract(p*.1031+mineralSeed*.001);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
  float mineralNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(mineralHash(i),mineralHash(i+vec3(1,0,0)),f.x),mix(mineralHash(i+vec3(0,1,0)),mineralHash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(mineralHash(i+vec3(0,0,1)),mineralHash(i+vec3(1,0,1)),f.x),mix(mineralHash(i+vec3(0,1,1)),mineralHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float stoneEdges(vec2 p){
    vec2 cell=floor(p),f=fract(p);float first=10.,second=10.;
    for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
      vec2 o=vec2(float(x),float(y));float h=mineralHash(vec3(cell+o,17.));
      vec2 delta=o+vec2(fract(h*17.13),fract(h*31.71))*.7+.15-f;
      float distance=dot(delta,delta);second=min(second,max(first,distance));first=min(first,distance);
    }
    return sqrt(second)-sqrt(first);
  }
  ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
  vec3 mineralPosition=vContactLocal+surfaceAnchor;
  float seaHeight=length(mineralPosition)-planetRadius;
  float wet=oceanWorld*(1.-smoothstep(.0002,.001,seaHeight));
  float pixelWorld=max(length(dFdx(vContactLocal)),length(dFdy(vContactLocal)));
  float gravel=mix(.5,mineralHash(floor(mineralPosition*7200.)),1.-smoothstep(.2,1.2,pixelWorld*7200.));
  float stone=mineralNoise(vContactLocal*440.+surfaceDetailAnchor);
  float strata=.5+.5*sin(seaHeight*600.+stone*.6);
  float crackFilter=1.-smoothstep(.4,1.8,pixelWorld*1100.);
  vec2 stoneLocal=(vContactLocal.xz*440.+surfaceDetailAnchor.xz)*2.5;
  float edge=stoneEdges(stoneLocal);
  float cracks=mix(1.,smoothstep(.01,.03+fwidth(edge)*1.5,edge),crackFilter*smoothstep(.3,.65,stone));
  float groundTone=(.83+.14*stone+.04*gravel+.025*strata)*mix(.94,1.,cracks);
  groundTone=mix(groundTone,.94,smoothstep(.06,.4,length(vViewPosition)));
  float mass=mineralNoise(mineralPosition*9.);
  float bedPhase=seaHeight*38.+mineralNoise(mineralPosition*5.)*32.+mineralNoise(mineralPosition*23.)*6.;
  float bedFilter=1.-smoothstep(.4,2.,fwidth(bedPhase));
  float beds=.5+.5*sin(bedPhase)*bedFilter;
  vec3 geology=mix(vec3(.91,.88,.96),vec3(1.03,1.01,.98),mix(.5,beds,smoothstep(.4,.75,mass)))*mix(.79,1.14,mass);
  diffuseColor.rgb*=mix(groundTone*geology,vec3(1.),wet);
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.8,1.06,1.13),wet*.3);
  `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
       float grainFilter=1.-smoothstep(.3,1.5,max(length(dFdx(vContactLocal)),length(dFdy(vContactLocal)))*440.);
       float rockHeight=stone*.00006*grainFilter;
       vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition);
       vec3 r1=cross(sy,normal),r2=cross(normal,sx);
       float det=dot(sx,r1);
       vec3 grad=sign(det)*(dFdx(rockHeight)*r1+dFdy(rockHeight)*r2);
       vec3 rockNormal=normalize(max(abs(det),1.e-20)*normal-grad);
       normal=normalize(mix(normal,rockNormal,1.-wet));`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
  roughnessFactor=mix(.95,.3,wet);
  `,
    );
  };
  material.customProgramCacheKey = () => 'surface-geology-v4';
}
