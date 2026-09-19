import * as T from 'three';
import { random, surfaceRadius, type Body } from './universe';
import { coastDirection } from './coast';

export const CLOUD_VOXELS = 48;
/** A tiled volume atlas uses ordinary filtered 2D textures on both backends. */
export function cloudDensity(seed: number) {
  const n = CLOUD_VOXELS,
    rng = random(seed);
  const lobes = Array.from({ length: 26 }, (_, i) => ({
    x: i < 5 ? (i - 2) * 0.28 : (rng() - 0.5) * 1.4,
    y: i < 5 ? -0.24 : -0.02 + rng() * 0.52,
    z: (rng() - 0.5) * 0.9,
    r: i < 5 ? 0.36 + rng() * 0.08 : 0.18 + rng() * 0.17,
  }));
  const data = new Uint8Array(n * n * n * 4);
  for (let z = 0; z < n; z++)
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const px = (x / (n - 1)) * 2 - 1,
          py = (y / (n - 1)) * 2 - 1,
          pz = (z / (n - 1)) * 2 - 1;
        let mass = -1;
        for (const l of lobes) {
          const dx = (px - l.x) / l.r,
            dy = (py - l.y) / (l.r * 0.8),
            dz = (pz - l.z) / l.r;
          mass = Math.max(mass, 1 - dx * dx - dy * dy - dz * dz);
        }
        const rough =
          (Math.sin(px * 21 + pz * 13 + seed) * Math.sin(py * 19 - pz * 17) +
            Math.sin(px * 39 + py * 33 - pz * 27) * 0.4) *
          0.09;
        const density = T.MathUtils.smoothstep(mass + rough, 0.02, 0.5);
        const edge = T.MathUtils.smoothstep(
          1 - Math.max(Math.abs(px), Math.abs(py), Math.abs(pz)),
          0,
          0.08,
        );
        const at =
          ((Math.floor(z / 8) * n + y) * (8 * n) + (z % 8) * n + x) * 4;
        data[at] = Math.round(255 * density * edge);
        data[at + 3] = 255;
      }
  // Store an outward density gradient beside density, avoiding extra
  // shadow-density lookups at every ray step on lower-powered GPUs.
  const offset = (x: number, y: number, z: number) =>
    ((Math.floor(z / 8) * n + y) * (8 * n) + (z % 8) * n + x) * 4;
  for (let z = 0; z < n; z++)
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const at = offset(x, y, z);
        const gradient = [
          data[offset(Math.max(0, x - 1), y, z)] -
            data[offset(Math.min(n - 1, x + 1), y, z)],
          data[offset(x, Math.max(0, y - 1), z)] -
            data[offset(x, Math.min(n - 1, y + 1), z)],
          data[offset(x, y, Math.max(0, z - 1))] -
            data[offset(x, y, Math.min(n - 1, z + 1))],
        ];
        for (let i = 0; i < 3; i++)
          data[at + 1 + i] = Math.round(
            127.5 + Math.max(-1, Math.min(1, gradient[i] / 127.5)) * 127.5,
          );
      }
  return data;
}
function densityTexture(seed: number) {
  const data = new Uint8Array(CLOUD_VOXELS ** 3 * 4 * 4);
  for (let i = 0; i < 4; i++)
    data.set(cloudDensity(seed + i * 73856093), i * CLOUD_VOXELS ** 3 * 4);
  const t = new T.DataTexture(
    data,
    CLOUD_VOXELS * 8,
    CLOUD_VOXELS * (CLOUD_VOXELS / 8) * 4,
  );
  t.minFilter = t.magFilter = T.LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}
export function cloudBankPose(body: Body, x: number, z: number) {
  const up = coastDirection(x, z, body.radius),
    orientation = new T.Quaternion().setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      up,
    );
  let ground = body.radius;
  for (const dx of [-4.8, 0, 4.8])
    for (const dz of [-4.8, 0, 4.8])
      ground = Math.max(
        ground,
        surfaceRadius(coastDirection(x + dx, z + dz, body.radius), body),
      );
  return {
    up,
    orientation,
    position: up
      .clone()
      .multiplyScalar(
        Math.max(
          body.radius + 5.2 + Math.max(0, Math.hypot(x, z) - 20) * 0.1,
          ground + 3.2,
        ),
      ),
  };
}

export function createVolumeCloudBanks(
  body: Body,
  key: { value: T.Vector3 },
  secondary: { value: T.Vector3 },
  detail: { value: number },
) {
  const group = new T.Group();
  group.name = 'coastal-cloud-volumes';
  const textures = [densityTexture(body.seed)];
  group.userData.cloudTextures = textures;
  const centers = [
    [-12, 12],
    [-7, 15],
    [-1, 13],
    [5, 18],
    [12, 20],
    [20, 24],
    [31, 25],
    [-12, 30],
    [-4, 29],
    [4, 33],
    [18, 37],
    [32, 40],
    [27, 16],
    [35, 28],
    [44, 38],
    [55, 50],
  ];
  const geometry = new T.BoxGeometry(2, 2, 2);
  const uniforms = {
    ...T.UniformsUtils.clone(T.UniformsLib.fog),
    bankDensity: { value: textures[0] },
    bankResolution: { value: CLOUD_VOXELS },
    bankVariant: { value: 0 },
    bankEye: { value: new T.Vector3() },
    bankSun: { value: new T.Vector3() },
    bankScale: { value: new T.Vector3(1, 1, 1) },
    bankDay: { value: 1 },
    bankDetail: detail,
  };
  const material = new T.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: T.BackSide,
    fog: true,
    vertexShader: `varying vec3 bankPoint;
        #include <fog_pars_vertex>
        void main(){bankPoint=position;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
          #include <fog_vertex>
        }`,
    fragmentShader: cloudVolumeFragment,
  });
  for (const [i, [x, z]] of centers.entries()) {
    const { up, orientation, position } = cloudBankPose(body, x, z);
    const mesh = new T.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.quaternion.copy(orientation);
    // Broader distant banks retain presence above the ridge line without
    // adding bounds or atlas memory. Vary the proportions between neighbors.
    const width = 2.5 + Math.min(1, Math.hypot(x, z) / 55) * 2;
    mesh.scale.set(width, 1.05 + (i % 3) * 0.22, 1.5 + (i % 4) * 0.18);
    const inverse = new T.Matrix4(),
      cameraPoint = new T.Vector3(),
      nativeSun = new T.Vector3();
    const inverseOrientation = orientation.clone().invert();
    mesh.onBeforeRender = (_renderer, _scene, camera) => {
      uniforms.bankVariant.value = i % 4;
      material.uniformsNeedUpdate = true;
      cameraPoint.setFromMatrixPosition(camera.matrixWorld);
      uniforms.bankEye.value
        .copy(cameraPoint)
        .applyMatrix4(inverse.copy(mesh.matrixWorld).invert());
      nativeSun.copy(
        key.value.dot(up) > secondary.value.dot(up)
          ? key.value
          : secondary.value,
      );
      uniforms.bankDay.value = T.MathUtils.smoothstep(
        nativeSun.dot(up),
        -0.14,
        0.2,
      );
      uniforms.bankScale.value.copy(mesh.scale);
      uniforms.bankSun.value
        .copy(nativeSun)
        .applyQuaternion(inverseOrientation)
        .normalize();
    };
    group.add(mesh);
  }
  return group;
}
export const cloudVolumeFragment = `varying vec3 bankPoint;
uniform sampler2D bankDensity;uniform float bankResolution;uniform float bankVariant;uniform vec3 bankEye;uniform vec3 bankSun;uniform vec3 bankScale;uniform float bankDay;uniform float bankDetail;
#include <fog_pars_fragment>
vec4 bankSlice(vec3 p,float slice){vec2 tile=vec2(mod(slice,8.),floor(slice/8.)+bankVariant*bankResolution/8.);return texture2D(bankDensity,(tile*bankResolution+p.xy*(bankResolution-1.)+.5)/vec2(bankResolution*8.,bankResolution*bankResolution/2.));}
vec4 bankField(vec3 point){vec3 p=point*.5+.5;float inside=step(0.,min(p.x,min(p.y,p.z)))*step(max(p.x,max(p.y,p.z)),1.);p=clamp(p,0.,1.);float slice=p.z*(bankResolution-1.);return mix(bankSlice(p,floor(slice)),bankSlice(p,min(bankResolution-1.,floor(slice)+1.)),fract(slice))*inside;}
void main(){vec3 ray=normalize(bankPoint-bankEye);vec3 reciprocal=1./(ray+sign(ray)*.000001+vec3(.00000001));vec3 a=(-vec3(1.)-bankEye)*reciprocal;vec3 b=(vec3(1.)-bankEye)*reciprocal;vec3 lo=min(a,b),hi=max(a,b);float start=max(0.,max(lo.x,max(lo.y,lo.z)));float end=min(hi.x,min(hi.y,hi.z));
float steps=bankDetail>.5?32.:16.;float stride=max(0.,end-start)/steps;float jitter=fract(sin(dot(bankPoint.xy,vec2(1271.1,3117.7)))*43758.5453);float transmission=1.;vec3 radiance=vec3(0.);
for(int i=0;i<32;i++){if(float(i)>=steps||transmission<.015)break;vec3 p=bankEye+ray*(start+(float(i)+jitter)*stride);vec4 field=bankField(p);float mass=field.r;if(mass>.001){vec3 gradient=(field.gba*2.-1.)/bankScale;vec3 normal=gradient/max(.035,length(gradient));float wrap=clamp(dot(normal,bankSun)*.6+.4,0.,1.);float lightMass=mass*(1.-wrap);if(bankDetail>.5){lightMass=bankField(p+bankSun/bankScale*1.4).r;}float lighting=.12+exp(-lightMass*2.2)*(.45+.55*wrap);float forward=pow(max(0.,dot(ray,bankSun)),6.);vec3 ambient=mix(vec3(.025,.034,.065),vec3(.24,.33,.49),bankDay);vec3 color=ambient+vec3(1.28,1.1,.88)*bankDay*(lighting*.85+forward*.18);float opacity=1.-exp(-mass*stride*14.);radiance+=transmission*opacity*color;transmission*=1.-opacity;}}
float alpha=1.-transmission;gl_FragColor=vec4(radiance/max(.0001,alpha),alpha);
#include <fog_fragment>
}`;
