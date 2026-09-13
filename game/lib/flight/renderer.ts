import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { type Body, elevation, random } from './universe';
import { FlightSimulation } from './simulation';
import { createShip } from './ship';
import { PATCH_COS, terrainColor } from './terrain';
import TerrainWorker from './terrain.worker?worker';
import ContactWorker from './contact.worker?worker';
import { createTerrainSkirt } from './terrain-seam';
import { addSurfaceMaterial } from './surface-material';
import {
  ContactSurface,
  SHIP_SCALE,
  CONTACT_RADIUS,
  type ContactData,
} from './contact';

type PlanetView = {
  body: Body;
  group: T.Group;
  clipCenter: { value: T.Vector3 };
  clipCos: { value: number };
  contactRadius: { value: number };
  patch?: T.Mesh;
  anchor?: T.Vector3;
};
const atmosphereVertex = `varying vec3 vNormal; varying vec3 vPosition; void main(){vNormal=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);vPosition=p.xyz;gl_Position=projectionMatrix*p;}`;
const atmosphereFragment = `varying vec3 vNormal;varying vec3 vPosition;uniform vec3 color; void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(-vPosition))),3.);gl_FragColor=vec4(color,rim*.52);}`;
const ringFragment = `varying vec2 vUv;void main(){float r=vUv.x;float bands=pow(.5+.5*sin(r*280.),5.)*.3+pow(.5+.5*sin(r*97.),12.)*.55+.06;float fade=smoothstep(0.,.08,r)*(1.-smoothstep(.9,1.,r));vec3 col=mix(vec3(.23,.015,.2),vec3(.95,.055,.54),bands);gl_FragColor=vec4(col*1.4,bands*fade*.8);}`;
function applyTerrainMask(
  material: T.MeshStandardMaterial,
  center: { value: T.Vector3 },
  cos: { value: number },
  patch = false,
  contactCenter = { value: new T.Vector3() },
  contactRadius = { value: 0 },
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.clipCenter = center;
    shader.uniforms.clipCos = cos;
    shader.uniforms.contactCenter = contactCenter;
    shader.uniforms.contactRadius = contactRadius;
    shader.vertexShader =
      'varying vec3 vSurfaceDirection; varying vec3 vTerrainPosition;\n' +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvSurfaceDirection=normalize(position);vTerrainPosition=position;',
    );
    shader.fragmentShader =
      'varying vec3 vSurfaceDirection; varying vec3 vTerrainPosition; uniform vec3 contactCenter;uniform float contactRadius; uniform vec3 clipCenter; uniform float clipCos;\n' +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <clipping_planes_fragment>',
      '#include <clipping_planes_fragment>\nif(dot(normalize(vSurfaceDirection),clipCenter) ' +
        (patch ? '<' : '>') +
        ' clipCos) discard;\nvec3 delta=vTerrainPosition-contactCenter;vec3 up=normalize(contactCenter);if(contactRadius>0. && abs(dot(delta,up))<contactRadius*2. && length(delta-up*dot(delta,up))<contactRadius) discard;',
    );
  };
  material.customProgramCacheKey = () =>
    patch ? 'terrain-patch' : 'terrain-globe';
}
function disposeObject(group: T.Object3D) {
  group.traverse((o) => {
    const m = o as T.Mesh;
    if (m.geometry) m.geometry.dispose();
    if (m.material) {
      const materials = Array.isArray(m.material) ? m.material : [m.material];
      materials.forEach((mat) => mat.dispose());
    }
  });
}

export class FlightRenderer {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(58, 1, 0.0001, 2000000);
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  craft = createShip();
  planets: PlanetView[] = [];
  system = -1;
  stars: T.Points;
  sun = new T.Group();
  nebula: T.Mesh;
  dust: T.LineSegments;
  dustPositions = new Float32Array(180 * 6);
  dustSeeds: number[][] = [];
  width = 1;
  height = 1;
  quality = 'high';
  disposed = false;
  frame = 0;
  worker: Worker;
  patchPending = false;
  patchToken = 0;
  contactWorker: Worker;
  contactPending = false;
  contactStats = {
    generated: 0,
    discarded: 0,
    generationMs: 0,
    vertices: 0,
    bytes: 0,
  };
  contactToken = 0;
  contactMesh: T.Mesh | null = null;
  contactCenter = { value: new T.Vector3() };
  keyLight = new T.DirectionalLight('#ffe1b4', 2.8);
  fillLight = new T.DirectionalLight('#478aff', 1.4);
  constructor(
    public canvas: HTMLCanvasElement,
    public sim: FlightSimulation,
  ) {
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
    });
    this.renderer.info.autoReset = false;
    this.renderer.setClearColor('#010309');
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene.add(new T.AmbientLight('#707baf', 1.05));
    this.keyLight.position.set(10, 7, 5);
    this.fillLight.position.set(-8, 1, -7);
    this.scene.add(this.keyLight, this.fillLight);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new T.Vector2(1, 1), 0.32, 0.45, 1.05);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.scene.add(this.craft.ship);
    const visibleStars = sim.systems.flatMap((s) => [
      s.star,
      ...(s.companion ? [s.companion] : []),
    ]);
    const positions = new Float32Array(visibleStars.length * 3),
      colors = new Float32Array(positions.length);
    visibleStars.forEach((s, i) => {
      s.position.toArray(positions, i * 3);
      new T.Color(s.color).multiplyScalar(1.2).toArray(colors, i * 3);
    });
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
    this.stars = new T.Points(
      geometry,
      new T.PointsMaterial({
        size: 2,
        sizeAttenuation: false,
        vertexColors: true,
        transparent: true,
        fog: false,
        opacity: 0.95,
      }),
    );
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);
    const nebulaMaterial = new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      uniforms: {
        air: { value: 0 },
        surfaceUp: { value: new T.Vector3(0, 1, 0) },
      },
      vertexShader:
        'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec3 v;uniform float air;uniform vec3 surfaceUp;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){vec3 p=normalize(v);float cloud=n(p*8.)*.6+n(p*19.)*.27+n(p*48.)*.13;float band=exp(-pow((p.y+p.x*.46+sin(p.z*4.)*.16)*5.,2.));float mist=pow(cloud,3.)*band;vec3 col=mix(vec3(.09,.013,.16),vec3(.04,.22,.31),smoothstep(.4,.75,cloud));vec3 space=vec3(.001,.002,.008)+col*mist*1.5;float horizon=pow(1.-abs(dot(p,surfaceUp)),3.);vec3 sky=mix(vec3(.016,.065,.13),vec3(.13,.31,.4),horizon);gl_FragColor=vec4(mix(space,sky,air),1.);}`,
    });
    this.nebula = new T.Mesh(
      new T.SphereGeometry(1500000, 24, 16),
      nebulaMaterial,
    );
    this.scene.add(this.nebula);
    const rng = random(921);
    for (let i = 0; i < 180; i++)
      this.dustSeeds.push([
        (rng() - 0.5) * 170,
        (rng() - 0.5) * 100,
        rng() * 300,
      ]);
    const dg = new T.BufferGeometry();
    dg.setAttribute('position', new T.BufferAttribute(this.dustPositions, 3));
    this.dust = new T.LineSegments(
      dg,
      new T.LineBasicMaterial({
        color: '#73c7eb',
        transparent: true,
        opacity: 0,
        blending: T.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);
    this.worker = new TerrainWorker();
    this.worker.onmessage = (
      event: MessageEvent<{
        id: string;
        center: number[];
        positions: Float32Array;
        colors: Float32Array;
        token: number;
      }>,
    ) => {
      this.patchPending = false;
      if (this.disposed || event.data.token !== this.patchToken) return;
      const p = this.planets.find((p) => p.body.id === event.data.id);
      if (!p) return;
      if (p.patch) {
        p.group.remove(p.patch);
        disposeObject(p.patch);
      }
      const g = new T.BufferGeometry();
      g.setAttribute(
        'position',
        new T.BufferAttribute(event.data.positions, 3),
      );
      g.setAttribute('color', new T.BufferAttribute(event.data.colors, 3));
      g.computeVertexNormals();
      g.computeBoundingSphere();
      const material = new T.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.83,
        metalness: p.body.kind === 'ocean' ? 0.17 : 0.04,
      });
      p.clipCenter.value.fromArray(event.data.center);
      p.clipCos.value = PATCH_COS;
      applyTerrainMask(
        material,
        p.clipCenter,
        p.clipCos,
        true,
        this.contactCenter,
        p.contactRadius,
      );
      p.patch = new T.Mesh(g, material);
      p.anchor = p.clipCenter.value.clone();
      p.group.add(p.patch);
    };
    this.worker.onerror = () => {
      this.patchPending = false;
    };
    this.contactWorker = new ContactWorker();
    this.contactWorker.onmessage = (
      event: MessageEvent<{
        data: ContactData;
        token: number;
        generationMs: number;
      }>,
    ) => {
      this.contactPending = false;
      if (event.data.token !== this.contactToken || this.disposed) {
        this.contactStats.discarded++;
        return;
      }
      const body = this.sim.systems
        .flatMap((s) => s.planets)
        .find((p) => p.id === event.data.data.bodyId);
      if (!body) return;
      const patch = new ContactSurface(event.data.data, body);
      if (
        body.id !== this.sim.nearest.id ||
        !patch.contains(this.sim.position)
      ) {
        this.contactStats.discarded++;
        return;
      }
      this.contactStats = {
        ...this.contactStats,
        generated: this.contactStats.generated + 1,
        generationMs: event.data.generationMs,
        vertices: patch.data.positions.length / 3,
        bytes:
          patch.data.positions.byteLength +
          patch.data.colors.byteLength +
          patch.data.indices.byteLength +
          patch.data.axis.byteLength,
      };
      if (
        this.sim.surface.phase === 'landing' ||
        this.sim.surface.phase === 'landed'
      )
        return;
      const geometry = new T.BufferGeometry();
      geometry.setAttribute(
        'position',
        new T.BufferAttribute(patch.data.positions, 3),
      );
      geometry.setAttribute(
        'color',
        new T.BufferAttribute(patch.data.colors, 3),
      );
      geometry.setIndex(new T.BufferAttribute(patch.data.indices, 1));
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      const material = new T.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.94,
        side: T.FrontSide,
      });
      // The replacement and flight mesh share a circular boundary; publish
      // collision only after the matching render mesh exists.
      material.onBeforeCompile = (shader) => {
        shader.vertexShader =
          'varying vec3 vContactLocal;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvContactLocal=position;',
        );
        shader.fragmentShader =
          'varying vec3 vContactLocal;uniform vec3 contactUp;\n' +
          shader.fragmentShader;
        shader.uniforms.contactUp = { value: patch.up };
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>\nif(length(vContactLocal-contactUp*dot(vContactLocal,contactUp))>${CONTACT_RADIUS.toFixed(1)}) discard;`,
        );
      };
      addSurfaceMaterial(material, body, patch.origin);
      if (this.contactMesh) {
        this.scene.remove(this.contactMesh);
        disposeObject(this.contactMesh);
      }
      this.contactMesh = new T.Mesh(geometry, material);
      const seam = createTerrainSkirt(patch),
        seamGeometry = new T.BufferGeometry();
      seamGeometry.setAttribute(
        'position',
        new T.BufferAttribute(seam.positions, 3),
      );
      seamGeometry.setAttribute('color', new T.BufferAttribute(seam.colors, 3));
      seamGeometry.setIndex(new T.BufferAttribute(seam.indices, 1));
      seamGeometry.computeVertexNormals();
      this.contactMesh.add(
        new T.Mesh(
          seamGeometry,
          new T.MeshStandardMaterial({
            vertexColors: true,
            roughness: 1,
            side: T.DoubleSide,
          }),
        ),
      );
      this.contactMesh.frustumCulled = false;
      this.scene.add(this.contactMesh);
      this.contactCenter.value.copy(patch.origin).sub(body.position);
      for (const view of this.planets)
        view.contactRadius.value =
          view.body.id === body.id ? CONTACT_RADIUS : 0;
      this.sim.surface.setPatch(patch);
    };
    this.contactWorker.onerror = () => {
      this.contactPending = false;
      this.sim.surface.message =
        'Ground mapping failed. Flight remains available.';
    };
    this.scene.add(this.sun);
    this.loadSystem();
    this.resize();
  }
  makePlanet(body: Body) {
    const group = new T.Group();
    const indexed = new T.SphereGeometry(body.radius, 192, 96);
    const geo = indexed.toNonIndexed();
    indexed.dispose();
    const pos = geo.getAttribute('position');
    const colors = new Float32Array(pos.count * 3);
    const d = new T.Vector3();
    const color = new T.Color();
    for (let i = 0; i < pos.count; i += 3) {
      let avg = 0;
      for (let j = 0; j < 3; j++) {
        d.fromBufferAttribute(pos, i + j).normalize();
        const h = elevation(d, body);
        avg += h / 3;
        d.multiplyScalar(
          body.radius + (body.kind === 'ocean' ? Math.max(0, h) : h),
        );
        pos.setXYZ(i + j, d.x, d.y, d.z);
      }
      color.copy(
        terrainColor(
          avg / body.radius,
          body.kind,
          0.94 + 0.06 * Math.abs(Math.sin(i * 7.713)),
        ),
      );
      for (let j = 0; j < 3; j++) color.toArray(colors, (i + j) * 3);
    }
    geo.setAttribute('color', new T.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const clipCenter = { value: new T.Vector3(0, 0, 1) },
      clipCos = { value: 2 },
      contactRadius = { value: 0 };
    const material = new T.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.83,
      metalness: body.kind === 'ocean' ? 0.17 : 0.04,
    });
    applyTerrainMask(
      material,
      clipCenter,
      clipCos,
      false,
      this.contactCenter,
      contactRadius,
    );
    const ground = new T.Mesh(geo, material);
    group.add(ground);
    const atmo = new T.Mesh(
      new T.SphereGeometry(body.radius * 1.052, 64, 40),
      new T.ShaderMaterial({
        uniforms: {
          color: {
            value: new T.Color(body.kind === 'desert' ? '#bc667b' : '#299fda'),
          },
        },
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        transparent: true,
        side: T.DoubleSide,
        blending: T.AdditiveBlending,
        depthWrite: false,
      }),
    );
    group.add(atmo);
    if (body.ring) {
      const ringGeo = new T.RingGeometry(
        body.radius * 1.28,
        body.radius * 2.13,
        256,
        8,
      );
      const uv = ringGeo.getAttribute('uv'),
        p = ringGeo.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        d.fromBufferAttribute(p, i);
        uv.setXY(i, (d.length() / body.radius - 1.28) / 0.85, 0);
      }
      const ring = new T.Mesh(
        ringGeo,
        new T.ShaderMaterial({
          vertexShader:
            'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
          fragmentShader: ringFragment,
          side: T.DoubleSide,
          transparent: true,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI * 0.39;
      ring.rotation.y = 0.12;
      ring.rotation.z = -0.23;
      group.add(ring);
    }
    this.scene.add(group);
    return { body, group, clipCenter, clipCos, contactRadius };
  }
  loadSystem() {
    if (this.system === this.sim.activeSystem.id) return;
    this.patchToken++;
    this.contactToken++;
    for (const view of this.planets) view.contactRadius.value = 0;
    if (this.contactMesh) {
      this.scene.remove(this.contactMesh);
      disposeObject(this.contactMesh);
      this.contactMesh = null;
    }
    if (this.sim.surface.phase === 'flight') this.sim.surface.patch = null;
    this.planets.forEach((p) => {
      this.scene.remove(p.group);
      disposeObject(p.group);
    });
    this.planets = this.sim.activeSystem.planets.map((p) => this.makePlanet(p));
    this.system = this.sim.activeSystem.id;
    disposeObject(this.sun);
    this.sun.clear();
    const body = this.sim.activeSystem.star;
    const sun = new T.Mesh(
      new T.IcosahedronGeometry(body.radius, 3),
      new T.MeshBasicMaterial({
        color: new T.Color(body.color).multiplyScalar(3),
      }),
    );
    this.sun.add(sun);
    const companion = this.sim.activeSystem.companion;
    if (companion) {
      const mesh = new T.Mesh(
        new T.IcosahedronGeometry(companion.radius, 3),
        new T.MeshBasicMaterial({
          color: new T.Color(companion.color).multiplyScalar(1.5),
        }),
      );
      mesh.position.copy(companion.position).sub(body.position);
      this.sun.add(mesh);
    }
    for (let i = 0; i < 3; i++) {
      const halo = new T.Mesh(
        new T.SphereGeometry(body.radius * (1.12 + i * 0.3), 32, 20),
        new T.ShaderMaterial({
          uniforms: { color: { value: new T.Color(body.color) } },
          vertexShader: atmosphereVertex,
          fragmentShader: atmosphereFragment,
          transparent: true,
          side: T.BackSide,
          blending: T.AdditiveBlending,
          depthWrite: false,
        }),
      );
      this.sun.add(halo);
    }
  }
  enableLogDepth() {
    this.scene.traverse((object) => {
      const material = (object as T.Mesh).material;
      if (!(material instanceof T.ShaderMaterial) || material.userData.logDepth)
        return;
      material.vertexShader =
        '#include <common>\n#include <logdepthbuf_pars_vertex>\n' +
        material.vertexShader.replace(
          /}\s*$/,
          '\n#include <logdepthbuf_vertex>\n}',
        );
      material.fragmentShader =
        '#include <logdepthbuf_pars_fragment>\n' +
        material.fragmentShader.replace(
          /void main\s*\(\s*\)\s*\{/,
          'void main(){\n#include <logdepthbuf_fragment>\n',
        );
      material.userData.logDepth = true;
      material.needsUpdate = true;
    });
  }
  resize() {
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    const ratio = Math.min(
      devicePixelRatio,
      this.quality === 'high' ? 1.5 : 0.8,
    );
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(this.width, this.height, false);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }
  draw(title: boolean, dt: number) {
    if (this.disposed) return;
    this.renderer.info.reset();
    this.loadSystem();
    this.enableLogDepth();
    this.frame++;
    this.planets.forEach((p) =>
      p.group.position.copy(p.body.position).sub(this.sim.position),
    );
    const near = this.planets.find((p) => p.body.id === this.sim.nearest.id);
    if (near && this.sim.altitude < 350 && !this.patchPending) {
      const center = this.sim.position
        .clone()
        .sub(near.body.position)
        .normalize();
      if (!near.anchor || near.anchor.angleTo(center) > 0.065) {
        this.patchPending = true;
        this.worker.postMessage({
          body: { ...near.body, position: undefined },
          center: center.toArray(),
          token: this.patchToken,
        });
      }
    }
    this.keyLight.position
      .copy(
        this.sim.activeSystem.companion?.position ||
          this.sim.activeSystem.position,
      )
      .sub(this.sim.position)
      .normalize()
      .multiplyScalar(10);
    this.sun.position
      .copy(this.sim.activeSystem.position)
      .sub(this.sim.position);
    this.stars.position.copy(this.sim.position).negate();
    const surface = this.sim.surface;
    if (
      this.sim.altitude < 60 &&
      !this.sim.nearest.star &&
      !this.contactPending &&
      surface.phase !== 'landing' &&
      surface.phase !== 'landed'
    ) {
      const patch = surface.patch;
      if (
        !patch ||
        patch.body.id !== this.sim.nearest.id ||
        this.sim.position
          .clone()
          .sub(patch.origin)
          .addScaledVector(
            patch.up,
            -this.sim.position.clone().sub(patch.origin).dot(patch.up),
          )
          .length() > 0.65
      ) {
        this.contactPending = true;
        this.contactWorker.postMessage({
          body: {
            ...this.sim.nearest,
            position: this.sim.nearest.position.toArray(),
          },
          center: this.sim.position
            .clone()
            .sub(this.sim.nearest.position)
            .normalize()
            .toArray(),
          token: this.contactToken,
        });
      }
    }
    if (this.contactMesh && surface.patch)
      this.contactMesh.position
        .copy(surface.patch.origin)
        .sub(this.sim.position);
    this.camera.position.set(0, 0, 0);
    const desired = this.sim.orientation.clone();
    if (title)
      desired.multiply(
        new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), 0.36),
      );
    this.camera.quaternion.slerp(
      desired,
      1 - Math.exp(-dt * (surface.phase === 'walking' ? 18 : 5)),
    );
    const fov = (title ? 58 : 60) + Math.min(17, this.sim.speed / 550);
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov += (fov - this.camera.fov) * 0.06;
      this.camera.updateProjectionMatrix();
    }
    if (title) {
      this.craft.ship.position
        .set(8.5, -4.3, -22)
        .applyQuaternion(this.camera.quaternion);
      this.craft.ship.quaternion.copy(this.sim.orientation);
      this.craft.ship.rotateY(-0.38);
      this.craft.ship.scale.setScalar(1.6);
    } else {
      this.craft.ship.scale.setScalar(SHIP_SCALE);
      this.craft.ship.quaternion.copy(
        surface.phase === 'walking'
          ? surface.shipOrientation
          : this.sim.orientation,
      );
      this.craft.ship.position.copy(
        surface.phase === 'walking'
          ? surface.shipPosition.clone().sub(this.sim.position)
          : new T.Vector3(),
      );
      if (surface.phase !== 'walking' && surface.phase !== 'restoring') {
        this.camera.position
          .set(0, 0.0135, 0.057)
          .applyQuaternion(this.camera.quaternion);
        // Keep the chase camera above the same contact surface during landing.
        const observer = this.sim.position.clone().add(this.camera.position),
          ground = surface.patch?.sample(observer);
        if (ground) {
          const clearance = observer
            .clone()
            .sub(ground.point)
            .dot(surface.patch!.up);
          if (clearance < 0.003)
            this.camera.position.addScaledVector(
              surface.patch!.up,
              0.003 - clearance,
            );
        }
      }
    }
    this.craft.gear.visible = [
      'landing',
      'landed',
      'walking',
      'takeoff',
      'restoring',
    ].includes(surface.phase);
    for (const e of this.craft.engines) {
      e.visible = !['landed', 'walking', 'restoring'].includes(surface.phase);
      e.scale.y = 0.35 + Math.min(3, this.sim.speed / 150) + (title ? 0.4 : 0);
    }
    const density = !this.sim.nearest.star
      ? Math.max(0, 1 - this.sim.altitude / 160)
      : 0;
    (this.stars.material as T.PointsMaterial).opacity =
      0.95 * (1 - density) ** 3;
    const sky = this.nebula.material as T.ShaderMaterial;
    sky.uniforms.air.value = density;
    sky.uniforms.surfaceUp.value
      .copy(this.sim.position)
      .sub(this.sim.nearest.position)
      .normalize();
    this.scene.fog =
      density > 0.01 ? new T.FogExp2('#23526d', density * 0.0015) : null;
    const material = this.dust.material as T.LineBasicMaterial;
    material.opacity = title ? 0 : Math.min(0.65, this.sim.speed / 1400);
    const stretch = Math.min(38, 1 + this.sim.speed / 160);
    for (let i = 0; i < this.dustSeeds.length; i++) {
      const [x, y, z] = this.dustSeeds[i];
      const depth =
        10 +
        ((((z - this.sim.elapsed * Math.min(240, this.sim.speed * 0.4)) % 300) +
          300) %
          300);
      const a = new T.Vector3(x, y, -depth).applyQuaternion(
          this.camera.quaternion,
        ),
        b = new T.Vector3(x, y, -depth - stretch).applyQuaternion(
          this.camera.quaternion,
        );
      a.toArray(this.dustPositions, i * 6);
      b.toArray(this.dustPositions, i * 6 + 3);
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
    if (this.quality === 'high') this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
  targetScreen() {
    const p = this.sim.target.position.clone().sub(this.sim.position);
    const inFront =
      p.dot(new T.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion)) >
      0;
    p.project(this.camera);
    return {
      x: (p.x * 0.5 + 0.5) * 100,
      y: (-p.y * 0.5 + 0.5) * 100,
      visible: inFront && Math.abs(p.x) < 0.9 && Math.abs(p.y) < 0.85,
    };
  }
  pick(nx: number, ny: number) {
    const ray = new T.Raycaster();
    ray.setFromCamera(new T.Vector2(nx, ny), this.camera);
    let best: Body | undefined,
      score = 0.998;
    for (const b of [
      ...this.sim.systems.flatMap((s) => [
        s.star,
        ...(s.companion ? [s.companion] : []),
      ]),
      ...this.sim.activeSystem.planets,
    ]) {
      const delta = b.position.clone().sub(this.sim.position);
      const alignment = delta.normalize().dot(ray.ray.direction);
      if (alignment > score) {
        score = alignment;
        best = b;
      }
    }
    if (best) this.sim.select(best.id);
    return best;
  }
  dispose() {
    this.disposed = true;
    this.worker.terminate();
    this.contactWorker.terminate();
    disposeObject(this.scene);
    this.composer.passes.forEach((pass) => pass.dispose());
    this.composer.dispose();
    this.renderer.dispose();
  }
}
