import { test, expect } from '@playwright/test';
test('adaptive terrain covers orbital descent and streams ahead during a long surface flight', async ({
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
      position: number[];
      contactReady: boolean;
      flightMessage: string;
      groundClearance: number;
      speed: number;
      terrainStats: {
        generated: number;
        leaves: number;
        vertices: number;
        triangles: number;
        maxDepth: number;
        generationMs: number;
        bytes: number;
      };
      contactStats: { generated: number; discarded: number };
    }>;
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  await expect
    .poll(async () => (await state()).terrainStats.generated)
    .toBeGreaterThan(0);
  const orbit = (await state()).terrainStats;
  await page.screenshot({ path: 'test-results/adaptive-orbit.png' });
  await page.evaluate(() =>
    window.__VOID_EXPLORER__!.scene('surface-traverse'),
  );
  await expect.poll(async () => (await state()).contactReady).toBe(true);
  await expect
    .poll(async () => (await state()).terrainStats.maxDepth)
    .toBeGreaterThan(orbit.maxDepth);
  const start = await state();
  await page.keyboard.down('w');
  await expect
    .poll(
      async () => {
        const current = await state();
        expect(current.groundClearance).toBeGreaterThan(0);
        expect(current.flightMessage).toBe('');
        return Math.hypot(
          ...current.position.map((value, i) => value - start.position[i]),
        );
      },
      { timeout: 35000 },
    )
    .toBeGreaterThan(2.2);
  await page.keyboard.up('w');
  const after = await state();
  expect(after.contactStats.generated).toBeGreaterThan(
    start.contactStats.generated + 2,
  );
  expect(after.speed).toBeGreaterThan(0.05);
  expect(after.terrainStats.leaves).toBeLessThanOrEqual(3000);
  expect(after.terrainStats.vertices).toBeLessThan(18000);
  expect(after.terrainStats.triangles).toBeLessThan(36000);
  expect(after.terrainStats.bytes).toBeLessThan(1000000);
  await page.keyboard.down('x');
  await page.waitForTimeout(1500);
  await page.keyboard.up('x');
  await page.screenshot({ path: 'test-results/adaptive-surface-flight.png' });
  console.log('adaptive terrain metrics', JSON.stringify(after.terrainStats));
  expect(errors).toEqual([]);
});
