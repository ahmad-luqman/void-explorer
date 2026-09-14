import * as T from 'three';
import { WebGPURenderer, RenderPipeline } from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { convertMaterial } from './materials';
import { browserGpu, type FlightGpuDevice } from './capability';

export class GpuBackend {
  private converted = new WeakMap<T.Material, T.Material>();
  private pipeline?: RenderPipeline;
  private scenePass?: ReturnType<typeof pass>;
  private bloomPass?: ReturnType<typeof bloom>;
  constructor(
    public renderer: WebGPURenderer,
    private device: FlightGpuDevice,
  ) {}
  static async create(canvas: HTMLCanvasElement) {
    const adapter = await browserGpu()?.requestAdapter({
      powerPreference: 'high-performance',
    });
    if (!adapter) return null;
    const device = await adapter.requestDevice({
      requiredFeatures: [...adapter.features],
    });
    const renderer = new WebGPURenderer({
      canvas,
      device,
      antialias: true,
      logarithmicDepthBuffer: true,
    });
    try {
      await renderer.init();
      return new GpuBackend(renderer, device);
    } catch (error) {
      await renderer.dispose();
      device.destroy();
      throw error;
    }
  }
  prepare(scene: T.Scene) {
    scene.traverse((object) => {
      const mesh = object as T.Mesh;
      if (!mesh.material) return;
      const convert = (source: T.Material) => {
        let replacement = this.converted.get(source);
        if (!replacement) {
          replacement = convertMaterial(source);
          this.converted.set(source, replacement);
          this.converted.set(replacement, replacement);
        }
        return replacement;
      };
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(convert)
        : convert(mesh.material);
    });
  }
  render(scene: T.Scene, camera: T.Camera, high: boolean) {
    this.prepare(scene);
    if (!high) {
      this.renderer.render(scene, camera);
      return;
    }
    if (!this.pipeline) {
      this.scenePass = pass(scene, camera);
      const color = this.scenePass.getTextureNode('output');
      this.bloomPass = bloom(color, 0.32, 0.45, 1.05);
      this.pipeline = new RenderPipeline(
        this.renderer,
        color.add(this.bloomPass),
      );
    }
    this.pipeline.render();
  }
  dispose() {
    this.pipeline?.dispose();
    this.scenePass?.dispose();
    this.bloomPass?.dispose();
    this.device.destroy();
  }
}
