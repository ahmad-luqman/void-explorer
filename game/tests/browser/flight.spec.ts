import { test, expect } from '@playwright/test';
test('start screen, settings, manual flight, navigation, and pause', async ({
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
  await page.screenshot({ path: 'test-results/title.png' });
  await page.getByRole('button', { name: /SETTINGS G/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Low', { exact: false }).check();
  await page.getByLabel('clean', { exact: true }).check();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled();
  await expect(page.locator('main')).toHaveClass(/clean/);
  await page.getByRole('button', { name: 'START EXPEDITION' }).click();
  await expect(page.locator('.flight-top')).toBeVisible();
  const before = (await page.evaluate(() =>
    window.__VOID_EXPLORER__!.state(),
  )) as { position: number[] };
  await page.keyboard.down('w');
  await page.waitForTimeout(1700);
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
    .toBeGreaterThan(20);
  const after = (await page.evaluate(() =>
    window.__VOID_EXPLORER__!.state(),
  )) as { position: number[] };
  expect(after.position).not.toEqual(before.position);
  await page.keyboard.down('x');
  await page.waitForTimeout(1300);
  await page.keyboard.up('x');
  await page.screenshot({ path: 'test-results/orbit.png' });
  await page.getByRole('button', { name: /Open star chart/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: /Ember Reach/ }).click();
  await expect(page.locator('.navigation h2')).toHaveText('Ember Reach');
  await page.getByRole('button', { name: /Engage autopilot/ }).click();
  await expect
    .poll(
      async () =>
        (
          (await page.evaluate(() => window.__VOID_EXPLORER__!.state())) as {
            autopilot: boolean;
          }
        ).autopilot,
    )
    .toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  const paused = await page.evaluate(() => window.__VOID_EXPLORER__!.state());
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(() => window.__VOID_EXPLORER__!.state()),
  ).toMatchObject({ position: (paused as { position: number[] }).position });
  await page.getByRole('button', { name: /Resume flight/ }).click();
  expect(errors).toEqual([]);
});
test('descent flies continuously to the surface', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('descent'));
  const before = (await page.evaluate(() =>
    window.__VOID_EXPLORER__!.state(),
  )) as { altitude: number };
  await page.getByRole('button', { name: /Descend to surface/ }).click();
  await expect
    .poll(
      async () =>
        (
          (await page.evaluate(() => window.__VOID_EXPLORER__!.state())) as {
            altitude: number;
          }
        ).altitude,
      { timeout: 25000 },
    )
    .toBeLessThan(30);
  const after = (await page.evaluate(() =>
    window.__VOID_EXPLORER__!.state(),
  )) as { altitude: number; status: string };
  expect(after.altitude).toBeLessThan(before.altitude);
  expect(after.altitude).toBeGreaterThan(4);
  expect(after.status).toBe('ATMOSPHERE');
  await expect
    .poll(
      async () =>
        (
          (await page.evaluate(() => window.__VOID_EXPLORER__!.state())) as {
            autopilot: boolean;
          }
        ).autopilot,
      { timeout: 20000 },
    )
    .toBe(false);
  await expect
    .poll(
      async () =>
        (
          (await page.evaluate(() => window.__VOID_EXPLORER__!.state())) as {
            terrainReady: boolean;
          }
        ).terrainReady,
    )
    .toBe(true);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/descent.png' });
});
test('small-screen start and touch controls remain usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  await page.screenshot({ path: 'test-results/mobile-title.png' });
  await page.getByRole('button', { name: 'START EXPEDITION' }).click();
  await expect(page.locator('.touch-controls')).toBeVisible();
  await page.getByRole('button', { name: /Open star chart/ }).click();
  await expect(page.getByPlaceholder('Search by name…')).toBeVisible();
  await page.getByPlaceholder('Search by name…').fill('nonexistent-system');
  await expect(page.getByText('No systems match that name.')).toBeVisible();
});
