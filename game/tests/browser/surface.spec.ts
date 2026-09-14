import { test, expect } from '@playwright/test';
test('land, walk, save, reload, reboard, and take off', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const state = () =>
    page.evaluate(() => window.__VOID_EXPLORER__!.state()) as Promise<{
      surfacePhase: string;
      contactReady: boolean;
      shipPosition: number[];
      surfaceShipPosition: number[];
      rotationTime: number;
      planetRotation: number[];
      planetMeshRotation: number[];
      contactMeshRotation: number[];
      position: number[];
      walked: number;
      shipDistance: number;
    }>;
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  await page.evaluate(() =>
    window.__VOID_EXPLORER__!.scene('rotating-landing'),
  );
  await expect.poll(async () => (await state()).contactReady).toBe(true);
  await page.getByRole('button', { name: /Land here/ }).click();
  await expect
    .poll(async () => (await state()).surfacePhase, { timeout: 25000 })
    .toBe('landed');
  const landed = await state();
  const parked = landed.surfaceShipPosition;
  const stableShip = async () => {
    const current = await state();
    expect(
      Math.hypot(...current.surfaceShipPosition.map((v, i) => v - parked[i])),
    ).toBeLessThan(1e-7);
    expect(current.planetMeshRotation).toEqual(current.planetRotation);
    expect(current.contactMeshRotation).toEqual(current.planetRotation);
    return current;
  };
  await page.screenshot({ path: 'test-results/landed.png' });
  await page.getByRole('button', { name: /Leave ship/ }).click();
  await expect.poll(async () => (await state()).surfacePhase).toBe('walking');
  await expect(page.locator('.surface-navigation')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/on-foot.png' });
  await page.keyboard.down('s');
  await expect
    .poll(async () => (await state()).walked, { timeout: 15000 })
    .toBeGreaterThan(0.004);
  await page.keyboard.up('s');
  await stableShip();
  const turning = await stableShip();
  expect(turning.rotationTime).toBeGreaterThan(landed.rotationTime);
  expect(
    Math.hypot(
      ...turning.shipPosition.map((v, i) => v - landed.shipPosition[i]),
    ),
  ).toBeGreaterThan(0.1);
  await page
    .getByRole('button', { name: 'Save expedition', exact: true })
    .click();
  const saved = await state();
  await page.reload();
  await expect(
    page.getByRole('button', { name: /Continue expedition/ }),
  ).toBeEnabled({ timeout: 45000 });
  await page.getByRole('button', { name: /Continue expedition/ }).click();
  await expect
    .poll(async () => (await state()).surfacePhase, { timeout: 15000 })
    .toBe('walking');
  await stableShip();
  expect(Math.abs((await state()).walked - saved.walked)).toBeLessThan(0.001);
  // Ground publishes before the next UI/render frame; capture the resumed view.
  await expect(page.locator('.surface-navigation')).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/restored-excursion.png' });
  await page.getByRole('button', { name: /Board ship/ }).click();
  await expect.poll(async () => (await state()).surfacePhase).toBe('landed');
  await page.getByRole('button', { name: /Take off/ }).click();
  await expect
    .poll(async () => (await state()).surfacePhase, { timeout: 10000 })
    .toBe('flight');
  await page.screenshot({ path: 'test-results/takeoff.png' });
  expect(errors).toEqual([]);
});
