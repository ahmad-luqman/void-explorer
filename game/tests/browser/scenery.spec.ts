import { test, expect } from '@playwright/test';
test('clouds and rock fields remain available through landing and an excursion', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const state = () =>
    page.evaluate(() => window.__VOID_EXPLORER__!.state()) as Promise<{
      sceneryCount: number;
      cloudLayers: number;
      contactReady: boolean;
      walked: number;
      shipPosition: number[];
    }>;
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  expect((await state()).cloudLayers).toBe(3);
  await page.screenshot({ path: 'test-results/scenery-orbit.png' });
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('landing'));
  await expect.poll(async () => (await state()).contactReady).toBe(true);
  await expect
    .poll(async () => (await state()).sceneryCount)
    .toBeGreaterThan(40);
  expect((await state()).sceneryCount).toBeLessThanOrEqual(700);
  await page.getByRole('button', { name: /Land here/ }).click();
  await expect(page.getByRole('button', { name: /Leave ship/ })).toBeVisible({
    timeout: 25000,
  });
  await page.getByRole('button', { name: /Leave ship/ }).click();
  const ship = (await state()).shipPosition;
  await page.keyboard.down('s');
  await expect
    .poll(async () => (await state()).walked, { timeout: 15000 })
    .toBeGreaterThan(0.023);
  await page.keyboard.up('s');
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(2100);
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/scenery-excursion.png' });
  expect((await state()).shipPosition).toEqual(ship);
  expect(errors).toEqual([]);
});
