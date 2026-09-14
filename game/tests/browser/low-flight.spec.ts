import { test, expect } from '@playwright/test';
test('manually descends to ground clearance and climbs away in the same flight', async ({
  page,
}) => {
  test.setTimeout(process.env.WEBGPU_TEST ? 150000 : 90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const state = () =>
    page.evaluate(() => window.__VOID_EXPLORER__!.state()) as Promise<{
      altitude: number;
      groundClearance: number;
      flightMessage: string;
      surfacePhase: string;
      contactReady: boolean;
      position: number[];
      orientation: number[];
      speed: number;
    }>;
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('low-flight'));
  await expect.poll(async () => (await state()).contactReady).toBe(true);
  const start = await state();
  await page.keyboard.down('w');
  await expect
    .poll(async () => (await state()).altitude, { timeout: 35000 })
    .toBeLessThan(0.05);
  await expect
    .poll(async () => (await state()).flightMessage, {
      timeout: process.env.WEBGPU_TEST ? 40000 : 15000,
    })
    .toContain('clearance');
  await page.keyboard.up('w');
  const near = await state();
  expect(near.surfacePhase).toBe('flight');
  expect(near.groundClearance).toBeGreaterThanOrEqual(-1e-7);
  expect(near.speed).toBe(0);
  expect(
    Math.hypot(...near.position.map((v, i) => v - start.position[i])),
  ).toBeGreaterThan(0.2);
  await page.screenshot({ path: 'test-results/manual-low-flight.png' });
  await page.keyboard.down('ArrowUp');
  await expect
    .poll(
      async () => {
        const q = (await state()).orientation;
        return 2 * (q[0] ** 2 + q[1] ** 2) - 1;
      },
      { timeout: 10000, intervals: [100] },
    )
    .toBeGreaterThan(0.6);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('w');
  await expect
    .poll(async () => (await state()).altitude, { timeout: 20000 })
    .toBeGreaterThan(near.altitude + 0.02);
  await page.keyboard.up('w');
  expect((await state()).flightMessage).toBe('');
  expect(errors).toEqual([]);
});
