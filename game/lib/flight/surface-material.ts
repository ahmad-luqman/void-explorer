import { MeshStandardMaterial, Vector3 } from 'three';
import {
  groundTexture,
  groundTextureAnchor,
  GROUND_TEXTURE_SCALE,
} from './ground-texture';
import {
  groundAlbedo,
  groundAlbedoAnchor,
  GROUND_ALBEDO_SCALE,
} from './ground-albedo';
import type { Body } from './universe';

// World-anchored mineral/gravel variation adds scale without changing contact
// heights or invalidating existing landed saves. Generated albedo has a procedural fallback.
export function addSurfaceMaterial(
  material: MeshStandardMaterial,
  body: Body,
  anchor: Vector3,
) {
  (material.userData.flightTerrain ??= {}).ground = { body, anchor };
  const previous = material.onBeforeCompile.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
    const albedo = groundAlbedo();
    shader.uniforms.groundAlbedo = { value: albedo.texture };
    shader.uniforms.groundAlbedoReady = albedo.ready;
    shader.uniforms.groundAlbedoAnchor = { value: groundAlbedoAnchor(anchor) };
    shader.uniforms.groundTexture = { value: groundTexture() };
    shader.uniforms.groundTextureAnchor = {
      value: groundTextureAnchor(anchor),
    };
    shader.vertexShader =
      'attribute float surfaceSmooth;varying float vSurfaceSmooth;varying vec3 vSurfaceViewNormal;varying vec3 vSurfaceNormal;\n' +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvSurfaceNormal=normal;vSurfaceSmooth=surfaceSmooth;vSurfaceViewNormal=normalMatrix*normal;',
    );
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
  uniform sampler2D groundAlbedo;uniform float groundAlbedoReady;uniform vec3 groundAlbedoAnchor;
  uniform sampler2D groundTexture;uniform vec3 groundTextureAnchor;varying vec3 vSurfaceNormal;varying vec3 vSurfaceViewNormal;varying float vSurfaceSmooth;
  vec4 sampleGround(vec3 p,vec3 n){
    vec3 weight=pow(abs(normalize(n)),vec3(4.));weight/=max(dot(weight,vec3(1.)),.0001);
    return texture2D(groundTexture,p.yz)*weight.x+texture2D(groundTexture,p.xz)*weight.y+texture2D(groundTexture,p.xy)*weight.z;
  }
  vec3 sampleAlbedo(vec3 p,vec3 n){
    vec3 weight=pow(abs(normalize(n)),vec3(4.));weight/=max(dot(weight,vec3(1.)),.0001);
    return texture2D(groundAlbedo,p.yz).rgb*weight.x+texture2D(groundAlbedo,p.xz).rgb*weight.y+texture2D(groundAlbedo,p.xy).rgb*weight.z;
  }
  ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
  vec3 mineralPosition=vContactLocal+surfaceAnchor;
  float seaHeight=length(mineralPosition)-planetRadius;
  float wet=oceanWorld*(1.-smoothstep(.0002,.001,seaHeight));
  float pixelWorld=max(length(dFdx(vContactLocal)),length(dFdy(vContactLocal)));
  float stone=mineralNoise(vContactLocal*440.+surfaceDetailAnchor);
  vec4 groundSample=sampleGround(vContactLocal*${GROUND_TEXTURE_SCALE.toFixed(1)}+groundTextureAnchor,vSurfaceNormal);
  vec3 albedoPoint=vContactLocal*${GROUND_ALBEDO_SCALE}+groundAlbedoAnchor;
  float soil=mineralNoise(mineralPosition*70.);
  vec3 turnedPoint=vec3(albedoPoint.z,-albedoPoint.x,albedoPoint.y)+vec3(.73,1.17,.39);
  vec3 slate=mix(sampleAlbedo(albedoPoint,vSurfaceNormal),sampleAlbedo(turnedPoint,vSurfaceNormal.zxy),smoothstep(.28,.72,soil));
  float flatness=pow(abs(dot(normalize(vSurfaceNormal),normalize(mineralPosition))),8.);
  float exposed=1.-flatness*smoothstep(.32,.68,soil)*.78;
  vec3 dust=vec3(.91,.87,.93)*mix(.9,1.08,stone);
  vec3 groundTone=mix(mix(dust,groundSample.rgb+.25,exposed),mix(dust,slate*2.1+.38,exposed),groundAlbedoReady);
  float mass=mineralNoise(mineralPosition*9.);
  float bedPhase=seaHeight*38.+mineralNoise(mineralPosition*5.)*32.+mineralNoise(mineralPosition*23.)*6.;
  float bedFilter=1.-smoothstep(.4,2.,fwidth(bedPhase));
  float beds=.5+.5*sin(bedPhase)*bedFilter;
  vec3 geology=mix(vec3(.91,.88,.96),vec3(1.03,1.01,.98),mix(.5,beds,smoothstep(.4,.75,mass)))*mix(.79,1.14,mass);
  vec3 cliffPosition=normalize(mineralPosition)*planetRadius*30.;
  float weather=mineralNoise(cliffPosition+vec3(seaHeight*.8));
  float steep=smoothstep(.12,.6,1.-abs(dot(normalize(vSurfaceNormal),normalize(mineralPosition))));
  vec3 cliffTone=mix(vec3(.74,.79,.90),vec3(1.02,1.,1.01),smoothstep(.2,.76,weather));
  float cliffFilter=1.-smoothstep(.25,1.,max(length(dFdx(cliffPosition)),length(dFdy(cliffPosition))));
  geology*=mix(vec3(1.),cliffTone,steep*cliffFilter);
  diffuseColor.rgb*=mix(groundTone*geology,vec3(1.),wet);
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.8,1.06,1.13),wet*.3);
  `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
       normal=normalize(mix(normal,normalize(vSurfaceViewNormal),vSurfaceSmooth));
       float grainFilter=1.-smoothstep(.3,1.5,max(length(dFdx(vContactLocal)),length(dFdy(vContactLocal)))*160.);
       float rockHeight=(mix(groundSample.a*.000008,dot(slate,vec3(.3333))*.000025,groundAlbedoReady)+stone*.000005)*grainFilter*exposed;
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
  material.customProgramCacheKey = () => 'surface-weathered-cliff-v9';
}
