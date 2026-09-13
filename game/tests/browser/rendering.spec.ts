import { test, expect } from '@playwright/test';

test('sunlit ground shadows, night sky, and water render without shader errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const state = () =>
    page.evaluate(() => window.__VOID_EXPLORER__!.state()) as Promise<{
      lighting: { daylight: number; density: number; shadows: boolean };
      contactReady: boolean;
      altitude: number;
    }>;
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('landing'));
  await expect.poll(async () => (await state()).contactReady).toBe(true);
  await page.getByRole('button', { name: /Land here/ }).click();
  await expect(page.getByRole('button', { name: /Leave ship/ })).toBeVisible({
    timeout: 25000,
  });
  await page.getByRole('button', { name: /Leave ship/ }).click();
  await expect.poll(async () => (await state()).lighting.shadows).toBe(true);
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/rendering-ground.png' });
  await page.keyboard.press('g');
  await page.getByLabel('Low', { exact: false }).check();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect.poll(async () => (await state()).lighting.shadows).toBe(false);
  await page.screenshot({ path: 'test-results/rendering-ground-low.png' });
  await page.keyboard.press('g');
  await page.getByLabel('High', { exact: false }).check();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect.poll(async () => (await state()).lighting.shadows).toBe(true);
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('night'));
  await expect.poll(async () => (await state()).lighting.daylight).toBe(0);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/rendering-night.png' });
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('water'));
  await expect.poll(async () => (await state()).contactReady).toBe(true);
  await expect.poll(async () => (await state()).altitude).toBeLessThan(7);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/rendering-water.png' });
  expect(errors).toEqual([]);
});
