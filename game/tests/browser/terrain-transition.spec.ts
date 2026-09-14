import { test, expect } from '@playwright/test';

test('planet morphs finish, revisited views reuse bounded terrain, and contact remains stable', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const state = () =>
    page.evaluate(() => window.__VOID_EXPLORER__!.state()) as Promise<{
      rendererBackend: string;
      contactReady: boolean;
      surfacePhase: string;
      position: number[];
      surfacePosition: number[];
      terrainStats: {
        generated: number;
        transitions: number;
        morphProgress: number;
        transitionMs: number;
        maxDelta: number;
        cache: { hits: number; misses: number; entries: number; bytes: number };
      };
    }>;
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  expect((await state()).rendererBackend).toBe(
    process.env.WEBGPU_TEST ? 'WEBGPU' : 'WEBGL',
  );
  await expect
    .poll(async () => (await state()).terrainStats.generated)
    .toBeGreaterThan(0);
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('landing'));
  await expect
    .poll(async () => (await state()).terrainStats.transitions)
    .toBeGreaterThan(0);
  await expect
    .poll(async () => (await state()).terrainStats.morphProgress, {
      timeout: 15000,
    })
    .toBe(1);
  const first = await state();
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('night'));
  await expect
    .poll(async () => (await state()).terrainStats.transitions)
    .toBeGreaterThan(first.terrainStats.transitions);
  await expect
    .poll(async () => (await state()).terrainStats.morphProgress, {
      timeout: 15000,
    })
    .toBe(1);
  const away = await state();
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('landing'));
  await expect
    .poll(async () => (await state()).terrainStats.cache.hits)
    .toBeGreaterThan(away.terrainStats.cache.hits);
  await expect
    .poll(async () => (await state()).terrainStats.morphProgress, {
      timeout: 15000,
    })
    .toBe(1);
  expect((await state()).terrainStats.cache.misses).toBe(
    away.terrainStats.cache.misses,
  );
  await expect.poll(async () => (await state()).contactReady).toBe(true);
  await page.getByRole('button', { name: /Land here/ }).click();
  await page
    .getByRole('button', { name: /Leave ship/ })
    .click({ timeout: 25000 });
  const parked = await state();
  await page.keyboard.press('g');
  await page.getByLabel('Low', { exact: false }).check();
  await expect
    .poll(async () => (await state()).terrainStats.transitions)
    .toBeGreaterThan(parked.terrainStats.transitions);
  await expect
    .poll(async () => (await state()).terrainStats.morphProgress, {
      timeout: 15000,
    })
    .toBe(1);
  expect(
    Math.hypot(
      ...(await state()).surfacePosition.map(
        (v, i) => v - parked.surfacePosition[i],
      ),
    ),
  ).toBeLessThan(1e-8);
  expect((await state()).surfacePhase).toBe('walking');
  const low = await state();
  await page.getByLabel('High', { exact: false }).check();
  await expect
    .poll(async () => (await state()).terrainStats.transitions)
    .toBeGreaterThan(low.terrainStats.transitions);
  await expect
    .poll(async () => (await state()).terrainStats.morphProgress, {
      timeout: 15000,
    })
    .toBe(1);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  const final = await state();
  // Resuming ground projection may change doubles by roundoff; allow 10 micrometers.
  expect(
    Math.hypot(
      ...final.surfacePosition.map(
        (value, i) => value - parked.surfacePosition[i],
      ),
    ),
  ).toBeLessThan(1e-8);
  expect(final.terrainStats.cache.entries).toBeLessThanOrEqual(12);
  expect(final.terrainStats.cache.bytes).toBeLessThanOrEqual(12 * 1024 * 1024);
  await page.screenshot({ path: 'test-results/terrain-transition-ground.png' });
  console.log('terrain transition metrics', JSON.stringify(final.terrainStats));
  expect(errors).toEqual([]);
});
