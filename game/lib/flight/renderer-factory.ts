import { FlightRenderer } from './renderer';
import { browserGpu } from './gpu/capability';
import type { GpuBackend } from './gpu/backend';
import type { FlightSimulation } from './simulation';
export type RendererPreference = 'auto' | 'webgl';
export async function createFlightRenderer(
  host: HTMLElement,
  sim: FlightSimulation,
  preference: RendererPreference = 'auto',
  signal?: AbortSignal,
) {
  const freshCanvas = () => {
    signal?.throwIfAborted();
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    host.replaceChildren(canvas);
    return canvas;
  };
  let canvas = freshCanvas();
  if (preference === 'auto' && browserGpu()) {
    let gpu: GpuBackend | null = null;
    try {
      const { GpuBackend } = await import('./gpu/backend');
      signal?.throwIfAborted();
      gpu = await GpuBackend.create(canvas);
      signal?.throwIfAborted();
      if (gpu) return new FlightRenderer(canvas, sim, gpu);
    } catch {
      gpu?.dispose();
      await gpu?.renderer.dispose();
      // A failed device/canvas initialization needs a fresh WebGL canvas.
      canvas = freshCanvas();
    }
  }
  signal?.throwIfAborted();
  return new FlightRenderer(canvas, sim);
}
