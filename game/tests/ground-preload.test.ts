import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Texture } from 'three';
const loader = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('three', async (original) => ({
  ...(await original<typeof import('three')>()),
  TextureLoader: class {
    load = loader.load;
  },
}));
let complete: (texture: Texture) => void;
let fail: () => void;
let texture: Texture;
let decode: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  texture = new Texture();
  decode = vi.fn().mockResolvedValue(undefined);
  texture.image = { decode };
  loader.load.mockImplementation((_url, onLoad, _progress, onError) => {
    complete = onLoad;
    fail = onError;
    return texture;
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
describe('optional surface image preparation', () => {
  it('waits for decoding and uploads the image before resolving readiness', async () => {
    const { preloadGroundAlbedo, groundAlbedo } =
      await import('../lib/flight/ground-albedo');
    let decoded!: () => void;
    decode.mockImplementation(
      () =>
        new Promise<void>((r) => {
          decoded = r;
        }),
    );
    const upload = vi.fn();
    const ready = preloadGroundAlbedo(upload);
    complete(texture);
    expect(upload).not.toHaveBeenCalled();
    expect(groundAlbedo().ready.value).toBe(0);
    decoded();
    expect(await ready).toBe(true);
    expect(upload).toHaveBeenCalledExactlyOnceWith(texture);
    expect(groundAlbedo().ready.value).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('allows startup after the deadline and retains the normal late-image path', async () => {
    const { preloadGroundAlbedo, groundAlbedo } =
      await import('../lib/flight/ground-albedo');
    const upload = vi.fn();
    const ready = preloadGroundAlbedo(upload);
    await vi.advanceTimersByTimeAsync(1500);
    expect(await ready).toBe(false);
    expect(upload).not.toHaveBeenCalled();
    complete(texture);
    await groundAlbedo().loaded;
    expect(groundAlbedo().ready.value).toBe(1);
    expect(upload).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['network', 'decode'])(
    'uses procedural ground after a %s failure',
    async (failure) => {
      const { preloadGroundAlbedo, groundAlbedo } =
        await import('../lib/flight/ground-albedo');
      const upload = vi.fn();
      const ready = preloadGroundAlbedo(upload);
      if (failure === 'network') fail();
      else {
        decode.mockRejectedValue(new Error('Decode failed'));
        complete(texture);
      }
      expect(await ready).toBe(false);
      expect(upload).not.toHaveBeenCalled();
      expect(groundAlbedo().ready.value).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
    },
  );
  it('cancels without uploading to a disposed renderer when decoding finishes later', async () => {
    const { preloadGroundAlbedo, groundAlbedo } =
      await import('../lib/flight/ground-albedo');
    const abort = new AbortController(),
      upload = vi.fn();
    const ready = preloadGroundAlbedo(upload, abort.signal);
    abort.abort();
    expect(await ready).toBe(false);
    complete(texture);
    await groundAlbedo().loaded;
    expect(upload).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
