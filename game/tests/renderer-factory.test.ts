import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlightSimulation } from '../lib/flight/simulation';
const mocks = vi.hoisted(() => ({ create: vi.fn(), renderer: vi.fn() }));
vi.mock('../lib/flight/renderer', () => ({
  FlightRenderer: class {
    constructor(...args: unknown[]) {
      mocks.renderer(...args);
    }
  },
}));
vi.mock('../lib/flight/gpu/backend', () => ({
  GpuBackend: { create: mocks.create },
}));
import { createFlightRenderer } from '../lib/flight/renderer-factory';
const sim = {} as FlightSimulation;
const replaceChildren = vi.fn();
const host = { replaceChildren } as unknown as HTMLElement;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('document', { createElement: () => ({ style: {} }) });
  vi.stubGlobal('navigator', { gpu: {} });
});
afterEach(() => vi.unstubAllGlobals());
describe('optional GPU initialization', () => {
  it('uses WebGL directly when requested', async () => {
    await createFlightRenderer(host, sim, 'webgl');
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.renderer).toHaveBeenCalledWith(expect.anything(), sim);
  });
  it('replaces a potentially locked canvas after GPU failure', async () => {
    mocks.create.mockRejectedValueOnce(
      new Error('Device initialization failed'),
    );
    await createFlightRenderer(host, sim);
    const canvases = replaceChildren.mock.calls;
    expect(canvases).toHaveLength(2);
    expect(canvases[0][0]).not.toBe(canvases[1][0]);
    expect(mocks.renderer).toHaveBeenCalledWith(canvases[1][0], sim);
  });
  it('does not replace a newer canvas when an old initialization is cancelled', async () => {
    const abort = new AbortController();
    const gpu = { dispose: vi.fn(), renderer: { dispose: vi.fn() } };
    mocks.create.mockImplementationOnce(async () => {
      abort.abort();
      return gpu;
    });
    await expect(
      createFlightRenderer(host, sim, 'auto', abort.signal),
    ).rejects.toThrow();
    expect(replaceChildren).toHaveBeenCalledTimes(1);
    expect(mocks.renderer).not.toHaveBeenCalled();
    expect(gpu.dispose).toHaveBeenCalledOnce();
    expect(gpu.renderer.dispose).toHaveBeenCalledOnce();
  });
});
