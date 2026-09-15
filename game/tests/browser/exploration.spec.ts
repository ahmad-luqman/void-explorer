import { test, expect } from '@playwright/test';

// Select the same game backend whether Chromium uses software or the host GPU.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    (preference) => {
      localStorage.setItem('void-renderer', preference);
    },
    process.env.WEBGPU_TEST ? 'auto' : 'webgl',
  );
});

test('coastal biome, vegetation and landmark survive a complete saved excursion', async ({
  page,
}) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const state = () =>
    page.evaluate(() => window.__VOID_EXPLORER__!.state()) as Promise<{
      surfacePhase: string;
      contactReady: boolean;
      vegetationCount: number;
      landmarkCount: number;
      walked: number;
      survey: {
        biome: string;
        landmark: { id: string; name: string; distance: number } | null;
      };
      surfaceShipPosition: number[];
      rendererBackend: string;
      drawCalls: number;
      triangles: number;
    }>;
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  await page.getByRole('button', { name: 'Explore Lumen Coast' }).click();
  await expect
    .poll(async () => (await state()).contactReady, { timeout: 20000 })
    .toBe(true);
  await page.getByRole('button', { name: /Land here/ }).click();
  await page
    .getByRole('button', { name: /Leave ship/ })
    .click({ timeout: 30000 });
  await expect(page.locator('.surface-survey')).toContainText('Tidal terraces');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/coastal-ship.png' });
  await page.getByRole('button', { name: 'Look over Lumen Bay' }).click();
  const walkStarted = Date.now();
  await page.keyboard.down('w');
  await expect
    .poll(async () => (await state()).walked, {
      // Software WebGPU advances the capped simulation more slowly than wall time.
      timeout: process.env.WEBGPU_TEST ? 40000 : 25000,
    })
    .toBeGreaterThan(0.028);
  await page.keyboard.up('w');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/coastal-bay.png' });
  const before = await state();
  console.log(
    'coastal render cost',
    JSON.stringify({
      backend: before.rendererBackend,
      drawCalls: before.drawCalls,
      triangles: before.triangles,
      walkWallMs: Date.now() - walkStarted,
    }),
  );
  expect(before.rendererBackend).toBe(
    process.env.WEBGPU_TEST ? 'WEBGPU' : 'WEBGL',
  );
  expect(before.vegetationCount).toBeGreaterThan(10);
  expect(before.landmarkCount).toBeGreaterThan(0);
  await page.getByRole('button', { name: /Tide Sentinels/ }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/coastal-vista.png' });
  expect((await state()).walked).toBeGreaterThan(0.028);
  await page.screenshot({ path: 'test-results/coastal-exploration.png' });
  await page
    .getByRole('button', { name: 'Save expedition', exact: true })
    .click();
  await page.reload();
  await page
    .getByRole('button', { name: /Continue expedition/ })
    .click({ timeout: 45000 });
  await expect(page.locator('.surface-survey')).toContainText(
    'Tidal terraces',
    { timeout: 20000 },
  );
  const restored = await state();
  expect(restored.survey.landmark?.id).toBe(before.survey.landmark?.id);
  expect(
    Math.hypot(
      ...restored.surfaceShipPosition.map(
        (v, i) => v - before.surfaceShipPosition[i],
      ),
    ),
  ).toBeLessThan(1e-7);
  expect(restored.vegetationCount).toBeGreaterThan(10);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('button', { name: /Tide Sentinels/ }),
  ).toBeInViewport();
  await page.getByRole('button', { name: /Tide Sentinels/ }).click();
  expect(
    await page.evaluate(() =>
      [
        ...document.querySelectorAll('.surface-navigation, .surface-survey'),
      ].some((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.left < innerWidth / 2 &&
          r.right > innerWidth / 2 &&
          r.top < innerHeight / 2 &&
          r.bottom > innerHeight / 2
        );
      }),
    ),
  ).toBe(false);
  await page.screenshot({
    path: 'test-results/coastal-exploration-mobile.png',
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole('button', { name: /Board ship/ }).click();
  await page.getByRole('button', { name: /Take off/ }).click();
  await expect
    .poll(async () => (await state()).surfacePhase, { timeout: 15000 })
    .toBe('flight');
  expect(errors).toEqual([]);
});
