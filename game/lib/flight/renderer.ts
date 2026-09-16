import { sampleBiome } from './biomes';
import type { TerrainStorage } from './terrain-storage';
import { planetRotation, toPlanet } from './rotation';
import * as T from 'three';
import type { WebGPURenderer } from 'three/webgpu';
import type { GpuBackend } from './gpu/backend';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { type Body, elevation } from './universe';
import { FlightSimulation } from './simulation';
import { flightFieldOfView, response } from './handling';
import { MotionEffects } from './motion-effects';
import { createShip } from './ship';
import { terrainColor } from './terrain';
import { contactRequest, terrainRefresh } from './terrain-stream';
import { blendTerrain, protectContact } from './terrain-transition';
import TerrainWorker from './terrain.worker?worker';
import ContactWorker from './contact.worker?worker';
import { createTerrainSkirt } from './terrain-seam';
import { addSurfaceMaterial } from './surface-material';
import { contactNormalBlend } from './contact-shading';
import { addWaterMaterial } from './water-material';
import { sampleEnvironment } from './environment';
import { createCloudLayer } from './clouds';
import { createSceneryView } from './scenery-view';
import type { SurfaceProp } from './scenery';
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
  atmosphere: T.ShaderMaterial;
  clouds: T.Mesh<T.BufferGeometry, T.ShaderMaterial>;
  ground: T.Mesh;
  patch?: T.Mesh;
  anchor?: T.Vector3;
  terrainQuality?: string;
  terrainKey?: number;
  terrainProjection?: number;
  transition?: {
    age: number;
    from: Float32Array;
    to: Float32Array;
    fromColors: Float32Array;
    toColors: Float32Array;
    fromHeights: Float32Array;
    toHeights: Float32Array;
  };
};
const daylightWhite = new T.Color('#fff3e8');
const atmosphereVertex = `varying vec3 vNormal; varying vec3 vPosition; void main(){vNormal=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);vPosition=p.xyz;gl_Position=projectionMatrix*p;}`;
const atmosphereFragment = `varying vec3 vNormal;varying vec3 vPosition;uniform vec3 color; void main(){float rim=pow(max(0.,1.-abs(dot(normalize(vNormal),normalize(-vPosition)))),3.);gl_FragColor=vec4(color,rim*.52);}`;
const planetAtmosphereVertex = `varying vec3 vRadial;varying vec3 vNormal;varying vec3 vPosition;void main(){vRadial=normalize(position);vNormal=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);vPosition=p.xyz;gl_Position=projectionMatrix*p;}`;
const planetAtmosphereFragment = `varying vec3 vRadial;varying vec3 vNormal;varying vec3 vPosition;uniform vec3 color;uniform vec3 keyDirection;uniform vec3 secondaryDirection;void main(){float sunlight=max(dot(normalize(vRadial),keyDirection),dot(normalize(vRadial),secondaryDirection));float day=smoothstep(-.18,.35,sunlight);float rim=pow(max(0.,1.-abs(dot(normalize(vNormal),normalize(-vPosition)))),3.);vec3 tint=mix(vec3(.22,.045,.3),color,day);gl_FragColor=vec4(tint,rim*(.08+day*.6));}`;
const ringFragment = `float ringBand(float r,float frequency,float power,float average){float phase=r*frequency;float detail=pow(.5+.5*sin(phase),power);return mix(detail,average,smoothstep(.15,.8,fwidth(phase)*sqrt(power)));}varying vec2 vUv;void main(){float r=vUv.x;float bands=ringBand(r,280.,5.,.24609375)*.3+ringBand(r,97.,12.,.16118026)*.55+ringBand(r,21.,2.,.375)*.12+.03;float fade=smoothstep(0.,.08,r)*(1.-smoothstep(.9,1.,r));vec3 col=mix(vec3(.23,.015,.2),vec3(.95,.055,.54),bands);gl_FragColor=vec4(col*1.4,bands*fade*.8);}`;
function applyTerrainMask(
  material: T.MeshStandardMaterial,
  center: { value: T.Vector3 },
  cos: { value: number },
  patch = false,
  contactCenter = { value: new T.Vector3() },
  contactRadius = { value: 0 },
) {
  material.userData.flightTerrain = {
    mask: { contactCenter, contactRadius, center, cos, patch },
  };
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
    if ((m as T.InstancedMesh).isInstancedMesh)
      (m as T.InstancedMesh).dispose();
    if (m.geometry) m.geometry.dispose();
    if (m.material) {
      const materials = Array.isArray(m.material) ? m.material : [m.material];
      materials.forEach((mat) => mat.dispose());
    }
  });
}

export class FlightRenderer {
  renderer: T.WebGLRenderer | WebGPURenderer;
  get backend() {
    return this.gpu ? 'WEBGPU' : 'WEBGL';
  }
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(58, 1, 0.0001, 2000000);
  private wasTitle = true;
  composer?: EffectComposer;
  bloom?: UnrealBloomPass;
  craft = createShip();
  planets: PlanetView[] = [];
  system = -1;
  originRevision = -1;
  terrainVersion = -1;
  stars: T.Points;
  sun = new T.Group();
  nebula: T.Mesh;
  motion = new MotionEffects();
  width = 1;
  height = 1;
  quality = 'high';
  disposed = false;
  suspended = false;
  frame = 0;
  worker: Worker;
  patchPending = false;
  patchToken = 0;
  terrainRequestAt = 0;
  terrainStats = {
    source: 'generated',
    bodyId: '',
    generated: 0,
    discarded: 0,
    generationMs: 0,
    vertices: 0,
    triangles: 0,
    leaves: 0,
    maxDepth: 0,
    bytes: 0,
    maxErrorPixels: 0,
    transitions: 0,
    transitionMs: 0,
    morphProgress: 1,
    maxDelta: 0,
    cache: { hits: 0, misses: 0, evictions: 0, bytes: 0, entries: 0 },
    storage: null as TerrainStorage['stats'] | null,
  };
  contactRetryAt = 0;
  contactWorker: Worker;
  contactPending = false;
  contactStats = {
    source: 'generated',
    storage: null as TerrainStorage['stats'] | null,
    generated: 0,
    discarded: 0,
    generationMs: 0,
    vertices: 0,
    bytes: 0,
  };
  contactToken = 0;
  contactMesh: T.Mesh | null = null;
  contactCenter = { value: new T.Vector3() };
  waterTime = { value: 0 };
  ambient = new T.AmbientLight('#8b91b5', 0.38);
  skyLight = new T.HemisphereLight('#7caabb', '#29213c', 0.7);
  haze = new T.FogExp2('#649bac', 0);
  lighting = { daylight: 1, density: 0, shadows: false };
  sceneryView: T.Group | null = null;
  sceneryProps: SurfaceProp[] | null = null;
  keyLight = new T.DirectionalLight('#ffe1b4', 2.8);
  fillLight = new T.DirectionalLight('#478aff', 1.4);
  constructor(
    public canvas: HTMLCanvasElement,
    public sim: FlightSimulation,
    private gpu?: GpuBackend,
  ) {
    this.renderer =
      gpu?.renderer ??
      new T.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
        logarithmicDepthBuffer: true,
      });
    this.renderer.info.autoReset = false;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.setClearColor('#010309');
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene.add(this.ambient, this.skyLight);
    this.keyLight.position.set(10, 7, 5);
    this.fillLight.position.set(-8, 1, -7);
    this.scene.add(this.keyLight, this.fillLight);
    this.scene.add(this.keyLight.target, this.fillLight.target);
    this.keyLight.shadow.mapSize.set(1536, 1536);
    Object.assign(this.keyLight.shadow.camera, {
      left: -1.8,
      right: 1.8,
      top: 1.8,
      bottom: -1.8,
      near: 0.001,
      far: 14,
    });
    this.keyLight.shadow.camera.updateProjectionMatrix();
    this.keyLight.shadow.bias = -0.00003;
    this.keyLight.shadow.normalBias = 0.0004;
    if (!gpu) {
      this.composer = new EffectComposer(this.renderer as T.WebGLRenderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new T.Vector2(1, 1), 0.32, 0.45, 1.05);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }
    this.scene.add(this.craft.ship);
    const visibleStars = sim.systems.flatMap((s) => [
      s.star,
      ...(s.companion ? [s.companion] : []),
    ]);
    const positions = new Float32Array(visibleStars.length * 3),
      colors = new Float32Array(positions.length);
    visibleStars.forEach((s, i) => {
      s.position
        .clone()
        .sub(sim.position)
        .clampLength(0, 1_000_000)
        .toArray(positions, i * 3);
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
        horizonColor: { value: new T.Color('#649bac') },
        zenithColor: { value: new T.Color('#123257') },
        sunDirection: { value: new T.Vector3() },
        daylight: { value: 1 },
      },
      vertexShader:
        'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec3 v;uniform float air;uniform vec3 surfaceUp;uniform vec3 horizonColor;uniform vec3 zenithColor;uniform vec3 sunDirection;uniform float daylight;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){vec3 p=normalize(v);float cloud=n(p*8.)*.6+n(p*19.)*.27+n(p*48.)*.13;float bandCoordinate=(p.y+p.x*.46+sin(p.z*4.)*.16)*5.;float band=exp(-bandCoordinate*bandCoordinate);float mist=pow(cloud,3.)*band;vec3 col=mix(vec3(.09,.013,.16),vec3(.04,.22,.31),smoothstep(.4,.75,cloud));vec3 space=vec3(.001,.002,.008)+col*mist*1.5;float horizon=pow(max(0.,1.-abs(dot(p,surfaceUp))),3.);float glow=pow(max(0.,dot(p,sunDirection)),12.)*daylight;vec3 sky=mix(zenithColor,horizonColor,horizon)+vec3(.18,.08,.045)*glow;gl_FragColor=vec4(mix(space,sky,air),1.);}`,
    });
    this.nebula = new T.Mesh(
      new T.SphereGeometry(1500000, 24, 16),
      nebulaMaterial,
    );
    this.scene.add(this.nebula);
    this.scene.add(this.motion.group);
    this.worker = new TerrainWorker();
    this.worker.onmessage = (
      event: MessageEvent<{
        id: string;
        observer: number[];
        quality: string;
        generationMs: number;
        key: number;
        projection: number;
        cache: {
          hits: number;
          misses: number;
          evictions: number;
          bytes: number;
          entries: number;
        };
        transitionMs: number;
        startPositions?: Float32Array;
        startColors?: Float32Array;
        startHeights?: Float32Array;
        maxDelta: number;
        leaves: number;
        maxDepth: number;
        maxErrorPixels: number;
        indices: Uint32Array;
        positions: Float32Array;
        colors: Float32Array;
        heights: Float32Array;
        token: number;
        error?: string;
        cacheHit?: boolean;
        storageHit?: boolean;
        storage: TerrainStorage['stats'];
      }>,
    ) => {
      if (this.disposed || event.data.token !== this.patchToken) {
        this.terrainStats.discarded++;
        return;
      }
      this.patchPending = false;
      if (event.data.error) {
        this.terrainRequestAt = performance.now() + 1000;
        return;
      }
      const p = this.planets.find((p) => p.body.id === event.data.id);
      if (!p) return;
      if (p.patch) {
        p.group.remove(p.patch);
        disposeObject(p.patch);
      }
      const data = event.data;
      const transitioning =
        !!data.startPositions && !!data.startColors && !!data.startHeights;
      if (transitioning) {
        protectContact(
          data.startPositions!,
          data.positions,
          toPlanet(this.sim.position, p.body),
          CONTACT_RADIUS + 20,
          [
            { from: data.startColors!, to: data.colors, size: 3 },
            { from: data.startHeights!, to: data.heights, size: 1 },
          ],
        );
        p.transition = {
          age: 0,
          from: data.startPositions!,
          to: data.positions,
          fromColors: data.startColors!,
          toColors: data.colors,
          fromHeights: data.startHeights!,
          toHeights: data.heights,
        };
      } else p.transition = undefined;
      const g = new T.BufferGeometry();
      g.setAttribute(
        'position',
        new T.BufferAttribute(
          transitioning ? data.startPositions!.slice() : data.positions,
          3,
        ).setUsage(T.DynamicDrawUsage),
      );
      g.setAttribute(
        'color',
        new T.BufferAttribute(
          transitioning ? data.startColors!.slice() : data.colors,
          3,
        ).setUsage(T.DynamicDrawUsage),
      );
      g.setAttribute(
        'terrainHeight',
        new T.BufferAttribute(
          transitioning ? data.startHeights!.slice() : data.heights,
          1,
        ).setUsage(T.DynamicDrawUsage),
      );
      g.setIndex(new T.BufferAttribute(event.data.indices, 1));
      g.computeVertexNormals();
      g.computeBoundingSphere();
      // A radial bound encloses every intermediate vertex through the blend.
      let radius = g.boundingSphere!.radius + g.boundingSphere!.center.length();
      for (let i = 0; i < data.positions.length; i += 3)
        radius = Math.max(
          radius,
          Math.hypot(
            data.positions[i],
            data.positions[i + 1],
            data.positions[i + 2],
          ),
        );
      g.boundingSphere = new T.Sphere(new T.Vector3(), radius);
      const material = new T.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.83,
        metalness: p.body.kind === 'ocean' ? 0.17 : 0.04,
      });
      p.clipCos.value = 2;
      applyTerrainMask(
        material,
        p.clipCenter,
        p.clipCos,
        false,
        this.contactCenter,
        p.contactRadius,
      );
      addWaterMaterial(material, p.body, new T.Vector3(), this.waterTime);
      p.patch = new T.Mesh(g, material);
      p.anchor = new T.Vector3().fromArray(event.data.observer);
      p.terrainQuality = event.data.quality;
      p.terrainKey = data.key;
      p.terrainProjection = data.projection;
      p.group.add(p.patch);
      if (p.ground.parent) {
        p.group.remove(p.ground);
        disposeObject(p.ground);
      }
      this.terrainStats = {
        ...this.terrainStats,
        source: data.cacheHit
          ? 'memory'
          : data.storageHit
            ? 'disk'
            : 'generated',
        bodyId: data.id,
        generated: this.terrainStats.generated + 1,
        transitions: this.terrainStats.transitions + Number(transitioning),
        morphProgress: transitioning ? 0 : 1,
        transitionMs: data.transitionMs,
        maxDelta: data.maxDelta,
        cache: data.cache,
        storage: data.storage,
        generationMs: event.data.generationMs,
        vertices: event.data.positions.length / 3,
        triangles: event.data.indices.length / 3,
        leaves: event.data.leaves,
        maxDepth: event.data.maxDepth,
        maxErrorPixels: event.data.maxErrorPixels,
        bytes:
          event.data.positions.byteLength +
          event.data.colors.byteLength +
          event.data.heights.byteLength +
          event.data.indices.byteLength +
          (data.startPositions?.byteLength ?? 0) +
          (data.startColors?.byteLength ?? 0) +
          (data.startHeights?.byteLength ?? 0),
      };
    };
    this.worker.onerror = () => {
      this.patchPending = false;
      this.terrainRequestAt = performance.now() + 1000;
    };
    this.contactWorker = new ContactWorker();
    this.contactWorker.onmessage = (
      event: MessageEvent<{
        data: ContactData;
        token: number;
        error?: string;
        cacheHit?: boolean;
        storageHit?: boolean;
        storage: TerrainStorage['stats'];
        generationMs: number;
      }>,
    ) => {
      if (event.data.token !== this.contactToken || this.disposed) {
        this.contactStats.discarded++;
        return;
      }
      this.contactPending = false;
      if (event.data.error) {
        this.contactRetryAt = performance.now() + 1000;
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
        source: event.data.cacheHit ? 'disk' : 'generated',
        storage: event.data.storage,
        generated: this.contactStats.generated + 1,
        generationMs: event.data.generationMs,
        vertices: patch.data.positions.length / 3,
        bytes:
          patch.data.positions.byteLength +
          patch.data.colors.byteLength +
          patch.data.heights.byteLength +
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
      geometry.setAttribute(
        'terrainHeight',
        new T.BufferAttribute(patch.data.heights, 1),
      );
      geometry.setAttribute(
        'surfaceSmooth',
        new T.BufferAttribute(contactNormalBlend(patch.data.axis), 1),
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
      material.userData.flightTerrain = {
        contact: {
          up: new T.Vector3().fromArray(patch.data.up),
          radius: CONTACT_RADIUS,
        },
      };
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
        shader.uniforms.contactUp = {
          value: new T.Vector3().fromArray(patch.data.up),
        };
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>\nif(length(vContactLocal-contactUp*dot(vContactLocal,contactUp))>${CONTACT_RADIUS.toFixed(1)}) discard;`,
        );
      };
      addSurfaceMaterial(
        material,
        body,
        new T.Vector3().fromArray(patch.data.origin),
      );
      addWaterMaterial(
        material,
        body,
        new T.Vector3().fromArray(patch.data.origin),
        this.waterTime,
      );
      if (this.contactMesh) {
        this.scene.remove(this.contactMesh);
        disposeObject(this.contactMesh);
      }
      this.contactMesh = new T.Mesh(geometry, material);
      // Publish a fully transformed mesh before restoring ground contact. A
      // worker reply may arrive between draw calls, especially during GPU setup.
      this.contactMesh.quaternion.copy(patch.rotation);
      this.contactMesh.position.copy(patch.origin).sub(this.sim.position);
      this.contactMesh.receiveShadow = true;
      this.contactMesh.castShadow = true;
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
      this.contactCenter.value.fromArray(patch.data.origin);
      for (const view of this.planets)
        view.contactRadius.value =
          // A tiny overlap buries the circular skirt under both meshes;
          // an inset skirt and identical masks otherwise leave a subpixel gap.
          view.body.id === body.id ? CONTACT_RADIUS - 0.01 : 0;
      this.sim.surface.setPatch(patch);
    };
    this.contactWorker.onerror = () => {
      this.contactPending = false;
      this.contactRetryAt = performance.now() + 1000;
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
    const heights = new Float32Array(pos.count);
    const d = new T.Vector3();
    const color = new T.Color();
    for (let i = 0; i < pos.count; i += 3) {
      let avg = 0;
      for (let j = 0; j < 3; j++) {
        d.fromBufferAttribute(pos, i + j).normalize();
        const h = elevation(d, body);
        heights[i + j] = h;
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
          sampleBiome(d.clone().normalize(), body, avg),
        ),
      );
      for (let j = 0; j < 3; j++) color.toArray(colors, (i + j) * 3);
    }
    geo.setAttribute('color', new T.BufferAttribute(colors, 3));
    geo.setAttribute('terrainHeight', new T.BufferAttribute(heights, 1));
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
    addWaterMaterial(material, body, new T.Vector3(), this.waterTime);
    const ground = new T.Mesh(geo, material);
    group.add(ground);
    const atmo = new T.Mesh(
      new T.SphereGeometry(body.radius * 1.052, 64, 40),
      new T.ShaderMaterial({
        uniforms: {
          color: {
            value: new T.Color(body.kind === 'desert' ? '#bc667b' : '#299fda'),
          },
          keyDirection: { value: new T.Vector3() },
          secondaryDirection: { value: new T.Vector3() },
        },
        vertexShader: planetAtmosphereVertex,
        fragmentShader: planetAtmosphereFragment,
        transparent: true,
        side: T.DoubleSide,
        blending: T.AdditiveBlending,
        depthWrite: false,
      }),
    );
    group.add(atmo);
    const clouds = createCloudLayer(
      body,
      this.waterTime,
      atmo.material.uniforms.keyDirection,
      atmo.material.uniforms.secondaryDirection,
    );
    group.add(clouds);
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
      ring.userData.fixedOrientation = ring.quaternion.clone();
      group.add(ring);
    }
    this.scene.add(group);
    return {
      body,
      group,
      ground,
      clipCenter,
      clipCos,
      contactRadius,
      atmosphere: atmo.material,
      clouds,
    };
  }
  loadSystem() {
    if (
      this.system === this.sim.activeSystem.id &&
      this.terrainVersion === this.sim.terrainVersion
    )
      return;
    this.terrainVersion = this.sim.terrainVersion;
    this.patchToken++;
    this.contactToken++;
    // Superseded replies are ignored, so they cannot release these flags for us.
    // The new system must be able to request its own terrain immediately.
    this.patchPending = false;
    this.contactPending = false;
    this.terrainRequestAt = 0;
    for (const view of this.planets) view.contactRadius.value = 0;
    if (this.contactMesh) {
      this.scene.remove(this.contactMesh);
      disposeObject(this.contactMesh);
      this.contactMesh = null;
    }
    if (this.sim.surface.phase === 'flight') {
      this.sim.surface.patch = null;
      this.sim.surface.scenery = [];
    }
    this.planets.forEach((p) => {
      p.clouds.material.uniforms.detail.value = this.quality === 'high' ? 1 : 0;
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
        fog: false,
      }),
    );
    this.sun.add(sun);
    const companion = this.sim.activeSystem.companion;
    if (companion) {
      const mesh = new T.Mesh(
        new T.IcosahedronGeometry(companion.radius, 3),
        new T.MeshBasicMaterial({
          color: new T.Color(companion.color).multiplyScalar(1.5),
          fog: false,
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
        material.fragmentShader
          .replace(
            /void main\s*\(\s*\)\s*\{/,
            'void main(){\n#include <logdepthbuf_fragment>\n',
          )
          .replace(
            /}\s*$/,
            '\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
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
    this.composer?.setPixelRatio(ratio);
    this.composer?.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }
  draw(title: boolean, dt: number) {
    if (this.disposed || this.suspended) return;
    this.renderer.info.reset();
    if (this.originRevision !== this.sim.originRevision) {
      this.originRevision = this.sim.originRevision;
      this.contactToken++;
      this.contactPending = false;
      for (const p of this.planets) p.contactRadius.value = 0;
      if (this.contactMesh) {
        this.scene.remove(this.contactMesh);
        disposeObject(this.contactMesh);
        this.contactMesh = null;
      }
    }
    this.loadSystem();
    this.enableLogDepth();
    this.frame++;
    this.planets.forEach((p) => {
      if (p.transition && p.patch) {
        const t = p.transition;
        t.age = Math.min(0.8, t.age + dt);
        const progress = t.age / 0.8;
        const geometry = p.patch.geometry;
        blendTerrain(
          geometry.attributes.position.array as Float32Array,
          t.from,
          t.to,
          progress,
        );
        blendTerrain(
          geometry.attributes.color.array as Float32Array,
          t.fromColors,
          t.toColors,
          progress,
        );
        blendTerrain(
          geometry.attributes.terrainHeight.array as Float32Array,
          t.fromHeights,
          t.toHeights,
          progress,
        );
        geometry.attributes.terrainHeight.needsUpdate = true;
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        this.terrainStats.morphProgress = progress;
        if (progress === 1) {
          geometry.computeVertexNormals();
          p.transition = undefined;
        }
      }
      p.group.position.copy(p.body.position).sub(this.sim.position);
      p.group.quaternion.copy(planetRotation(p.body));
      // Rings keep their orbital plane as the solid world turns beneath them.
      for (const child of p.group.children)
        if (child.userData.fixedOrientation)
          child.quaternion
            .copy(p.group.quaternion)
            .invert()
            .multiply(child.userData.fixedOrientation);
      p.atmosphere.uniforms.keyDirection.value
        .copy(
          this.sim.activeSystem.companion?.position ??
            this.sim.activeSystem.star.position,
        )
        .sub(p.body.position)
        .normalize()
        .applyQuaternion(p.group.quaternion.clone().invert());
      p.atmosphere.uniforms.secondaryDirection.value
        .copy(this.sim.activeSystem.star.position)
        .sub(p.body.position)
        .normalize()
        .applyQuaternion(p.group.quaternion.clone().invert());
    });
    const near = this.planets.find((p) => p.body.id === this.sim.nearest.id);
    // Budget for the narrowest FOV; animated speed FOV must not fragment the cache.
    const projection = Math.min(
      1000,
      this.height / (2 * Math.tan(T.MathUtils.degToRad(58 / 2))),
    );
    if (
      near &&
      this.sim.altitude < 5000 &&
      !this.patchPending &&
      !near.transition &&
      performance.now() >= this.terrainRequestAt
    ) {
      const observer = toPlanet(this.sim.position, near.body);
      if (
        terrainRefresh(
          observer,
          near.anchor,
          near.body.radius,
          near.terrainQuality !== this.quality ||
            near.terrainProjection !== projection,
        )
      ) {
        this.patchPending = true;
        this.terrainRequestAt = performance.now() + 500;
        this.worker.postMessage({
          body: { ...near.body, position: undefined },
          observer: observer.toArray(),
          token: this.patchToken,
          previousKey: near.terrainKey,
          quality: this.quality,
          options: {
            pixels: this.quality === 'high' ? 2 : 5,
            projection,
            maxLeaves: this.quality === 'high' ? 3000 : 1500,
          },
        });
      }
    }
    this.sun.position
      .copy(this.sim.activeSystem.position)
      .sub(this.sim.position);
    // Far stars retain their real directions on a bounded camera-relative shell.
    const starPositions = this.stars.geometry.attributes.position;
    let starIndex = 0;
    for (const system of this.sim.systems)
      for (const body of [
        system.star,
        ...(system.companion ? [system.companion] : []),
      ]) {
        const delta = body.position
          .clone()
          .sub(this.sim.position)
          .clampLength(0, 1_000_000);
        starPositions.setXYZ(starIndex++, delta.x, delta.y, delta.z);
      }
    starPositions.needsUpdate = true;
    const surface = this.sim.surface;
    if (this.sceneryProps !== surface.scenery) {
      if (this.sceneryView) {
        this.scene.remove(this.sceneryView);
        disposeObject(this.sceneryView);
      }
      this.sceneryProps = surface.scenery;
      this.sceneryView = surface.patch
        ? createSceneryView(
            surface.scenery.map((prop) => ({
              ...prop,
              point: toPlanet(prop.point, surface.patch!.body),
              normal: prop.normal
                .clone()
                .applyQuaternion(surface.patch!.rotation.clone().invert()),
            })),
            new T.Vector3().fromArray(surface.patch.data.origin),
            surface.patch.body.kind,
          )
        : null;
      if (this.sceneryView) this.scene.add(this.sceneryView);
    }
    if (this.sceneryView && surface.patch) {
      this.sceneryView.quaternion.copy(surface.patch.rotation);
      this.sceneryView.position
        .copy(surface.patch.origin)
        .sub(this.sim.position);
      this.sceneryView.visible = surface.patch.body.id === this.sim.nearest.id;
    }
    if (
      this.sim.altitude < 60 &&
      !this.sim.nearest.star &&
      !this.contactPending &&
      surface.phase !== 'landing' &&
      surface.phase !== 'landed'
    ) {
      const center = contactRequest(
        this.sim.nearest,
        this.sim.position,
        new T.Vector3(0, 0, -this.sim.speed).applyQuaternion(
          this.sim.orientation,
        ),
        surface.patch,
      );
      if (center && performance.now() >= this.contactRetryAt) {
        this.contactPending = true;
        this.contactWorker.postMessage({
          body: {
            ...this.sim.nearest,
            rotationClock: undefined,
            position: this.sim.nearest.position.toArray(),
          },
          center: center.toArray(),
          token: this.contactToken,
        });
      }
    }
    if (this.contactMesh && surface.patch) {
      this.contactMesh.quaternion.copy(surface.patch.rotation);
      this.contactMesh.position
        .copy(surface.patch.origin)
        .sub(this.sim.position);
    }
    this.camera.position.set(0, 0, 0);
    const desired = this.sim.orientation.clone();
    if (title)
      desired.multiply(
        new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), 0.36),
      );
    // Starting/continuing an expedition changes frames instantly. Do not carry
    // the title's orbit camera through that transition, especially on slow GPUs.
    if (this.wasTitle && !title) this.camera.quaternion.copy(desired);
    else
      this.camera.quaternion.slerp(
        desired,
        response(surface.phase === 'walking' ? 18 : 7, dt),
      );
    this.wasTitle = title;
    const fov = flightFieldOfView(
      this.sim.speed,
      title,
      surface.phase === 'walking',
    );
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov += (fov - this.camera.fov) * response(3.8, dt);
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
    this.craft.setGearDeployment(surface.gearDeployment);
    for (const e of this.craft.engines) {
      e.visible = !['landed', 'walking', 'restoring'].includes(surface.phase);
      e.scale.y = 0.35 + Math.min(3, this.sim.speed / 150) + (title ? 0.4 : 0);
    }
    for (const core of this.craft.cores) {
      const material = core.material as T.MeshStandardMaterial;
      material.emissiveIntensity = ['landed', 'walking', 'restoring'].includes(
        surface.phase,
      )
        ? 0.22
        : 2.2 + this.sim.throttle;
    }
    const environment = sampleEnvironment(
      this.sim.nearest,
      this.sim.activeSystem,
      this.sim.position,
      this.sim.altitude,
    );
    const { density, daylight } = environment;
    this.waterTime.value = this.sim.elapsed;
    this.keyLight.target.position.copy(this.craft.ship.position);
    this.keyLight.position
      .copy(this.keyLight.target.position)
      .addScaledVector(environment.keyDirection, 6);
    this.keyLight.color
      .set(
        this.sim.activeSystem.companion?.color ??
          this.sim.activeSystem.star.color!,
      )
      .lerp(daylightWhite, 0.65);
    this.keyLight.intensity = environment.keyIntensity;
    this.fillLight.target.position.copy(this.craft.ship.position);
    this.fillLight.position
      .copy(this.fillLight.target.position)
      .addScaledVector(environment.secondaryDirection, 10);
    this.fillLight.color
      .set(this.sim.activeSystem.star.color!)
      .lerp(daylightWhite, 0.65);
    this.fillLight.intensity = environment.secondaryIntensity;
    this.ambient.intensity = 0.38 - density * 0.2;
    this.skyLight.position.copy(environment.up);
    this.skyLight.color.set('#b7c8ea');
    this.skyLight.intensity = density * (0.25 + daylight * 0.4);
    const shadowActive =
      !title &&
      this.quality === 'high' &&
      !!surface.patch &&
      environment.keyHeight > 0.06 &&
      (this.sim.altitude < 0.5 || surface.phase === 'walking');
    // Keep WebGPU's cached shadow graph alive across High/Low and altitude
    // changes. Toggling castShadow disposes a node still used by the bloom pass.
    this.keyLight.castShadow = this.gpu ? true : shadowActive;
    this.keyLight.shadow.intensity = shadowActive ? 1 : 0;
    this.keyLight.shadow.autoUpdate = shadowActive;
    // Initialize the depth target before it can be sampled by inactive shadows;
    // attaching an already sampled texture later invalidates cached GPU bindings.
    this.keyLight.shadow.needsUpdate =
      shadowActive || !this.keyLight.shadow.map;
    this.lighting = { daylight, density, shadows: shadowActive };
    (this.stars.material as T.PointsMaterial).opacity = environment.starOpacity;
    const sky = this.nebula.material as T.ShaderMaterial;
    sky.uniforms.air.value = density;
    sky.uniforms.surfaceUp.value.copy(environment.up);
    sky.uniforms.horizonColor.value.copy(environment.horizon);
    sky.uniforms.zenithColor.value.copy(environment.zenith);
    sky.uniforms.sunDirection.value.copy(environment.keyDirection);
    sky.uniforms.daylight.value = daylight;
    this.haze.color.copy(environment.horizon);
    this.haze.density = environment.hazeDensity;
    this.scene.fog = density > 0.001 ? this.haze : null;
    this.motion.update(
      {
        elapsed: this.sim.elapsed,
        speed: this.sim.speed,
        density,
        pulse: this.sim.pulse,
        active: !title && surface.phase === 'flight',
        orientation: this.sim.orientation,
        angularVelocity: this.sim.angularVelocity,
      },
      this.quality === 'low',
    );
    if (this.gpu)
      this.gpu.render(this.scene, this.camera, this.quality === 'high');
    else if (this.quality === 'high') this.composer!.render();
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
    if (this.disposed) return;
    this.disposed = true;
    this.craft.dispose();
    this.worker.terminate();
    this.contactWorker.terminate();
    disposeObject(this.scene);
    this.composer?.passes.forEach((pass) => pass.dispose());
    this.composer?.dispose();
    this.gpu?.dispose();
    this.keyLight.shadow.dispose();
    void this.renderer.dispose();
  }
}
