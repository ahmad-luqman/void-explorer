import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    (value) => localStorage.setItem('void-renderer', value),
    process.env.WEBGPU_TEST ? 'auto' : 'webgl',
  );
});
test('terrain streams during real low-altitude flight with a bounded mesh', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const state = () =>
    page.evaluate(() => window.__VOID_EXPLORER__!.state()) as Promise<{
      position: number[];
      altitude: number;
      contactReady: boolean;
      contactStats: {
        generated: number;
        vertices: number;
        generationMs: number;
        bytes: number;
      };
    }>;
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  await page.evaluate(() =>
    window.__VOID_EXPLORER__!.scene('terrain-traverse'),
  );
  await expect.poll(async () => (await state()).contactReady).toBe(true);
  const before = await state();
  await page.keyboard.down('w');
  await expect
    .poll(async () => (await state()).contactStats.generated, {
      timeout: 15000,
    })
    .toBeGreaterThan(before.contactStats.generated + 1);
  await page.keyboard.up('w');
  await page.keyboard.down('x');
  await page.waitForTimeout(1200);
  await page.keyboard.up('x');
  const after = await state();
  expect(after.position).not.toEqual(before.position);
  expect(after.altitude).toBeGreaterThan(0);
  expect(after.contactStats.vertices).toBeLessThan(90000);
  expect(after.contactStats.bytes).toBeLessThan(5000000);
  await page.screenshot({ path: 'test-results/terrain-traverse.png' });
  console.log('terrain worker metrics', JSON.stringify(after.contactStats));
  expect(errors).toEqual([]);
});
