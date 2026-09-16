import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    (preference) => localStorage.setItem('void-renderer', preference),
    process.env.WEBGPU_TEST ? 'auto' : 'webgl',
  );
});
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
  await expect(page.locator('.title-top')).toContainText(
    process.env.WEBGPU_TEST ? 'WEBGPU' : 'WEBGL',
  );
  await expect
    .poll(async () => page.evaluate(() => window.__VOID_EXPLORER__!.state()))
    .toMatchObject({ shipModel: 'authored', gearDeployment: 0 });
  await page.screenshot({ path: 'test-results/authored-ship-title.png' });
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('landing'));
  await expect
    .poll(async () => page.evaluate(() => window.__VOID_EXPLORER__!.state()))
    .toMatchObject({ contactReady: true });
  await page.getByRole('button', { name: /Land here/ }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window.__VOID_EXPLORER__!.state() as { gearDeployment: number })
            .gearDeployment,
      ),
    )
    .toBeGreaterThan(0);
  await page.screenshot({
    path: `test-results/gear-deploying-${process.env.WEBGPU_TEST ? 'webgpu' : 'webgl'}.png`,
  });
  await expect(page.getByRole('button', { name: /Leave ship/ })).toBeVisible({
    timeout: 25000,
  });
  await page.getByRole('button', { name: /Leave ship/ }).click();
  await expect(page.locator('.surface-navigation')).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/authored-ship-on-foot.png' });
  await expect
    .poll(() => page.evaluate(() => window.__VOID_EXPLORER__!.state()))
    .toMatchObject({ gearDeployment: 1 });
  await page
    .getByRole('button', { name: 'Save expedition', exact: true })
    .click();
  // Hold the authored model across save restoration: fallback must already be down.
  let releaseModel!: () => void;
  const modelGate = new Promise<void>((resolve) => {
    releaseModel = resolve;
  });
  await page.route('**/models/aurora-v1.glb', async (route) => {
    await modelGate;
    await route.continue();
  });
  await page.reload();
  await page.getByRole('button', { name: /Continue expedition/ }).click();
  await expect(page.locator('.surface-navigation')).toBeVisible({
    timeout: 20000,
  });
  await expect
    .poll(() => page.evaluate(() => window.__VOID_EXPLORER__!.state()))
    .toMatchObject({ shipModel: 'loading', gearDeployment: 1 });
  releaseModel();
  await expect
    .poll(() => page.evaluate(() => window.__VOID_EXPLORER__!.state()))
    .toMatchObject({ shipModel: 'authored', gearDeployment: 1 });
  await page.screenshot({
    path: `test-results/gear-restored-${process.env.WEBGPU_TEST ? 'webgpu' : 'webgl'}.png`,
  });
  await page.getByRole('button', { name: /Board ship/ }).click();
  await page.getByRole('button', { name: /Take off/ }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window.__VOID_EXPLORER__!.state() as { gearDeployment: number })
            .gearDeployment,
      ),
    )
    .toBeLessThan(1);
  await page.screenshot({
    path: `test-results/gear-retracting-${process.env.WEBGPU_TEST ? 'webgpu' : 'webgl'}.png`,
  });
  await expect
    .poll(() => page.evaluate(() => window.__VOID_EXPLORER__!.state()))
    .toMatchObject({ surfacePhase: 'flight', gearDeployment: 0 });
  expect(errors).toEqual([]);
});
test('asset failure retains a flyable fallback', async ({ page }) => {
  await page.route('**/models/aurora-v1.glb', (route) => route.abort());
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  await expect(page.locator('.title-top')).toContainText(
    process.env.WEBGPU_TEST ? 'WEBGPU' : 'WEBGL',
  );
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
