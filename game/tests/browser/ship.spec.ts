import { test, expect } from '@playwright/test';
test('loads the authored ship and keeps the surface journey available', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  await expect
    .poll(async () => page.evaluate(() => window.__VOID_EXPLORER__!.state()))
    .toMatchObject({ shipModel: 'authored' });
  await page.screenshot({ path: 'test-results/authored-ship-title.png' });
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('landing'));
  await expect
    .poll(async () => page.evaluate(() => window.__VOID_EXPLORER__!.state()))
    .toMatchObject({ contactReady: true });
  await page.getByRole('button', { name: /Land here/ }).click();
  await expect(page.getByRole('button', { name: /Leave ship/ })).toBeVisible({
    timeout: 25000,
  });
  await page.getByRole('button', { name: /Leave ship/ }).click();
  await expect(page.locator('.surface-navigation')).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/authored-ship-on-foot.png' });
  expect(errors).toEqual([]);
});
test('asset failure retains a flyable fallback', async ({ page }) => {
  await page.route('**/models/aurora-v1.glb', (route) => route.abort());
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  await expect
    .poll(async () => page.evaluate(() => window.__VOID_EXPLORER__!.state()))
    .toMatchObject({ shipModel: 'fallback' });
  await page.getByRole('button', { name: 'START EXPEDITION' }).click();
  await page.keyboard.down('w');
  await page.waitForTimeout(800);
  await page.keyboard.up('w');
  await expect
    .poll(
      async () =>
        (
          (await page.evaluate(() => window.__VOID_EXPLORER__!.state())) as {
            speed: number;
          }
        ).speed,
    )
    .toBeGreaterThan(1);
});
