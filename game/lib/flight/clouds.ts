import * as T from 'three';
import { type Body, surfaceRadius } from './universe';

// A thin weather layer follows the same terrain heightfield, 18 km above it.
// The shell is shared by orbital and below-cloud views; no sky-only replacement.
export function createCloudLayer(
  body: Body,
  time: { value: number },
  keyDirection: { value: T.Vector3 },
  secondaryDirection: { value: T.Vector3 },
) {
  const geometry = new T.SphereGeometry(body.radius, 128, 64);
  const positions = geometry.attributes.position,
    direction = new T.Vector3();
  for (let i = 0; i < positions.count; i++) {
    direction.fromBufferAttribute(positions, i).normalize();
    direction.multiplyScalar(surfaceRadius(direction, body) + 18);
    positions.setXYZ(i, direction.x, direction.y, direction.z);
  }
  geometry.computeBoundingSphere();
  const material = new T.ShaderMaterial({
    transparent: true,
    side: T.DoubleSide,
    forceSinglePass: true,
    depthWrite: false,
    fog: true,
    uniforms: {
      ...T.UniformsUtils.clone(T.UniformsLib.fog),
      time,
      keyDirection,
      secondaryDirection,
      seed: { value: body.seed % 991 },
      detail: { value: 1 },
      coverage: {
        value:
          body.kind === 'desert' ? 0.61 : body.kind === 'ice' ? 0.52 : 0.54,
      },
      tint: {
        value: new T.Color(body.kind === 'desert' ? '#e3b6b5' : '#f4e5e8'),
      },
    },
    vertexShader: `varying vec3 cloudDirection;varying vec3 cloudView;
      #include <fog_pars_vertex>
      void main(){cloudDirection=normalize(position);vec4 mvPosition=modelViewMatrix*vec4(position,1.);
        cloudView=mvPosition.xyz;gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `varying vec3 cloudDirection;varying vec3 cloudView;
      uniform float time;uniform float seed;uniform float coverage;uniform float detail;
      uniform vec3 tint;uniform vec3 keyDirection;uniform vec3 secondaryDirection;
      #include <fog_pars_fragment>
      float cloudHash(vec3 p){p=fract(p*.1031+seed*.003);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float cloudNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(cloudHash(i),cloudHash(i+vec3(1,0,0)),f.x),mix(cloudHash(i+vec3(0,1,0)),cloudHash(i+vec3(1,1,0)),f.x),f.y),
        mix(mix(cloudHash(i+vec3(0,0,1)),cloudHash(i+vec3(1,0,1)),f.x),mix(cloudHash(i+vec3(0,1,1)),cloudHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){vec3 radial=normalize(cloudDirection);
        vec3 p=radial*210.+vec3(time*.0006,0.,time*.00022);
        float base=cloudNoise(p);
        float field=base*.62+cloudNoise(p*2.7)*.26+(detail>.5?cloudNoise(p*7.)*.12:.06);
        float mass=smoothstep(coverage,coverage+.12,field);
        float light=smoothstep(-.18,.5,max(dot(radial,keyDirection),dot(radial,secondaryDirection)));
        vec3 sun=normalize(keyDirection+secondaryDirection*.25);
        float towardSun=cloudNoise(p+sun*.65);
        float relief=clamp(.5+(base-towardSun)*2.3,0.,1.);
        float thickness=smoothstep(coverage,coverage+.24,field);
        vec3 shade=mix(vec3(.32,.4,.56),tint,relief*.75+.2);
        vec3 color=mix(vec3(.025,.03,.065),shade,light);
        color+=vec3(.28,.19,.09)*light*(1.-thickness)*mass;
        float closeFade=smoothstep(.15,1.5,length(cloudView));
        gl_FragColor=vec4(color,mass*.94*closeFade);
        #include <fog_fragment>
      }`,
  });
  const mesh = new T.Mesh(geometry, material);
  return mesh;
}
