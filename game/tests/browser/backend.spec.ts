import { test, expect } from '@playwright/test';

const startButton = 'START EXPEDITION';
test('renderer draws visible pixels in both quality modes and switches to WebGL', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: startButton })).toBeEnabled({
    timeout: 45000,
  });
  const backend = () =>
    page.evaluate(
      () =>
        (window.__VOID_EXPLORER__!.state() as { rendererBackend: string })
          .rendererBackend,
    );
  expect(await backend()).toBe(process.env.WEBGPU_TEST ? 'WEBGPU' : 'WEBGL');
  // Inspect the actual rendered canvas, excluding the HTML HUD. Shader NaNs can
  // otherwise produce a blank frame without a JavaScript or validation error.
  const litPixels = () =>
    page.evaluate(
      () =>
        new Promise<number>((resolve) =>
          requestAnimationFrame(() => {
            const canvas = document.querySelector(
              '.space-canvas canvas',
            ) as HTMLCanvasElement;
            const sample = document.createElement('canvas');
            sample.width = sample.height = 64;
            const context = sample.getContext('2d')!;
            context.drawImage(canvas, 0, 0, 64, 64);
            const pixels = context.getImageData(0, 0, 64, 64).data;
            let lit = 0;
            for (let i = 0; i < pixels.length; i += 4)
              if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 70) lit++;
            resolve(lit);
          }),
        ),
    );
  await expect.poll(litPixels).toBeGreaterThan(300);
  await page.getByRole('button', { name: /SETTINGS G/ }).click();
  await page.getByLabel('Low', { exact: false }).check();
  await expect.poll(litPixels).toBeGreaterThan(300);
  await page.getByLabel('High', { exact: false }).check();
  await expect.poll(litPixels).toBeGreaterThan(300);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: startButton }).click();
  await page.keyboard.press('g');
  await page.getByLabel('Renderer preference').selectOption('webgl');
  await expect(
    page.getByRole('button', { name: 'Continue expedition' }),
  ).toBeVisible();
  expect(await backend()).toBe('WEBGL');
  await expect.poll(litPixels).toBeGreaterThan(300);
  expect(errors).toEqual([]);
});

for (const failure of ['missing', 'adapter', 'device'] as const) {
  test(`WebGL fallback when WebGPU ${failure} is unavailable`, async ({
    page,
  }) => {
    await page.addInitScript((failure) => {
      const gpu =
        failure === 'missing'
          ? undefined
          : {
              requestAdapter: async () =>
                failure === 'adapter'
                  ? null
                  : {
                      features: [],
                      requestDevice: async () => {
                        throw new Error('Device refused');
                      },
                    },
            };
      Object.defineProperty(navigator, 'gpu', {
        configurable: true,
        value: gpu,
      });
    }, failure);
    await page.goto('/');
    await expect(page.getByRole('button', { name: startButton })).toBeEnabled({
      timeout: 45000,
    });
    expect(
      await page.evaluate(
        () =>
          (window.__VOID_EXPLORER__!.state() as { rendererBackend: string })
            .rendererBackend,
      ),
    ).toBe('WEBGL');
    await page.getByRole('button', { name: startButton }).click();
    await expect(page.locator('.flight-top')).toBeVisible();
  });
}

test('device loss stops flight and offers a saved WebGL recovery', async ({
  page,
}) => {
  test.skip(!process.env.WEBGPU_TEST, 'Requires a real WebGPU device');
  await page.addInitScript(() => {
    type Device = {
      destroy(): void;
      lost: Promise<{ reason: string; message: string }>;
    };
    type Adapter = { requestDevice(options: unknown): Promise<Device> };
    const gpu = (
      navigator as unknown as {
        gpu: { requestAdapter(options: unknown): Promise<Adapter | null> };
      }
    ).gpu;
    const request = gpu.requestAdapter.bind(gpu);
    gpu.requestAdapter = async (options) => {
      const adapter = await request(options);
      if (adapter) {
        const create = adapter.requestDevice.bind(adapter);
        adapter.requestDevice = async (options) => {
          const device = await create(options);
          // Three intentionally ignores explicit destroy(). Reclassify this
          // real device loss as unexpected to exercise its recovery callback.
          Object.defineProperty(device, 'lost', {
            value: device.lost.then((info) => ({
              reason: 'unknown',
              message: info.message,
            })),
          });
          (window as unknown as { loseDevice: () => void }).loseDevice = () =>
            device.destroy();
          return device;
        };
      }
      return adapter;
    };
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: startButton })).toBeEnabled({
    timeout: 45000,
  });
  await page.getByRole('button', { name: startButton }).click();
  await page.keyboard.down('w');
  await page.waitForTimeout(400);
  await page.evaluate(() =>
    (window as unknown as { loseDevice: () => void }).loseDevice(),
  );
  await page.keyboard.up('w');
  await expect(page.getByRole('alert')).toContainText(
    'graphics device was disconnected',
  );
  const state = await page.evaluate(() => window.__VOID_EXPLORER__!.state());
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__VOID_EXPLORER__!.state())).toEqual(
    state,
  );
  await page.getByRole('button', { name: 'Use WebGL' }).click();
  await page.getByRole('button', { name: 'Continue expedition' }).click();
  expect(
    await page.evaluate(
      () =>
        (window.__VOID_EXPLORER__!.state() as { rendererBackend: string })
          .rendererBackend,
    ),
  ).toBe('WEBGL');
  await expect(page.locator('.flight-top')).toBeVisible();
});
