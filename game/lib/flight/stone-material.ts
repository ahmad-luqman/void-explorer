import { MeshStandardMaterial } from 'three';
import { groundTexture } from './ground-texture';
import { groundAlbedo } from './ground-albedo';

export function stoneUniforms() {
  const albedo = groundAlbedo();
  return {
    stoneTexture: { value: groundTexture() },
    stoneAlbedo: { value: albedo.texture },
    stoneAlbedoReady: albedo.ready,
  };
}

// Coordinates are measured in kilometers within each instance. Stable per-prop
// phases avoid world-origin precision loss and move with the rotating landscape.
export const stoneFragment = `varying vec3 stonePoint;varying vec3 stoneNormal;varying vec3 stonePhase;
uniform sampler2D stoneTexture;uniform sampler2D stoneAlbedo;uniform float stoneAlbedoReady;
vec4 stoneField(vec3 p,vec3 weight){return texture2D(stoneTexture,p.yz)*weight.x+texture2D(stoneTexture,p.xz)*weight.y+texture2D(stoneTexture,p.xy)*weight.z;}
vec3 stoneSlate(vec3 p,vec3 weight){return texture2D(stoneAlbedo,p.yz).rgb*weight.x+texture2D(stoneAlbedo,p.xz).rgb*weight.y+texture2D(stoneAlbedo,p.xy).rgb*weight.z;}
void main(){
vec3 n=normalize(stoneNormal);vec3 weight=pow(abs(n),vec3(4.));weight/=max(dot(weight,vec3(1.)),.0001);
vec4 grain=stoneField(stonePoint*400.+stonePhase,weight);
vec3 slate=stoneSlate(stonePoint*416.6666666666667+stonePhase,weight);
float bandPhase=stonePoint.y*900.+sin(stonePoint.x*330.+stonePhase.x*6.)*.7+sin(stonePoint.z*260.)*.4;
float bandFilter=1.-smoothstep(.4,2.,fwidth(bandPhase));
float bands=.5+.5*sin(bandPhase)*bandFilter;
float dust=smoothstep(.25,.85,n.y)*(.25+grain.a*.55);
vec3 tone=mix(grain.rgb+.25,slate*2.1+.38,stoneAlbedoReady);
tone*=mix(vec3(.82,.85,.93),vec3(1.08,1.03,1.),bands);
tone=mix(tone,vec3(1.03,.98,1.01),dust);
float pixelWorld=max(length(dFdx(stonePoint)),length(dFdy(stonePoint)));
float relief=mix(grain.a,dot(slate,vec3(.3333)),stoneAlbedoReady)*.000008*(1.-dust)*(1.-smoothstep(.002,.009,pixelWorld));
gl_FragColor=vec4(tone,relief);
}`;

export function addStoneMaterial(material: MeshStandardMaterial) {
  (material.userData.flightTerrain ??= {}).stone = true;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, stoneUniforms());
    shader.vertexShader =
      'attribute vec3 stoneScale;attribute vec3 stoneOffset;varying vec3 stonePoint;varying vec3 stoneNormal;varying vec3 stonePhase;\n' +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nstonePoint=position*stoneScale;stoneNormal=normal/stoneScale;stonePhase=stoneOffset;',
    );
    const code = stoneFragment
      .replace('void main()', 'vec4 shadeStone()')
      .replace('gl_FragColor=', 'return ');
    shader.fragmentShader = code + '\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      '#include <color_fragment>\nvec4 stoneDetail=shadeStone();diffuseColor.rgb*=stoneDetail.rgb;',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition);
vec3 r1=cross(sy,normal),r2=cross(normal,sx);float det=dot(sx,r1);
vec3 grad=sign(det)*(dFdx(stoneDetail.a)*r1+dFdy(stoneDetail.a)*r2);
normal=normalize(max(abs(det),1.e-20)*normal-grad);`,
    );
  };
  material.customProgramCacheKey = () => 'weathered-instanced-stone-v1';
}
