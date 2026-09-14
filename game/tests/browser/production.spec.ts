import { test, expect } from '@playwright/test';
test('production export loads terrain workers and supports a complete approach', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const workers: string[] = [];
  page.on('worker', (worker) => workers.push(worker.url()));
  const modelResponse = page.waitForResponse((response) =>
    response.url().endsWith('/models/aurora-v1.glb'),
  );
  await page.goto('/');
  expect((await modelResponse).status()).toBe(200);
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  await expect(page.locator('.title-top')).toContainText(
    process.env.WEBGPU_TEST ? 'WEBGPU' : 'WEBGL',
  );
  await page.screenshot({ path: 'test-results/production-title.png' });
  await page.getByRole('button', { name: 'START EXPEDITION' }).click();
  await expect(page.locator('.flight-top')).toBeVisible();
  await page.getByRole('button', { name: /Descend to surface/ }).click();
  await expect(page.locator('.arrival')).toContainText('AUTOPILOT');
  await expect(page.locator('.arrival')).toContainText('MANUAL FLIGHT', {
    timeout: 45000,
  });
  await expect(page.locator('.telemetry')).toContainText('ATMOSPHERE');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/production-surface.png' });
  await page.getByRole('button', { name: /Land here/ }).click();
  await expect(page.getByRole('button', { name: /Leave ship/ })).toBeVisible({
    timeout: 25000,
  });
  await page.getByRole('button', { name: /Leave ship/ }).click();
  await expect(page.locator('.surface-navigation')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.surface-survey')).toBeInViewport();
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
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.keyboard.down('s');
  await page.waitForTimeout(1500);
  await page.keyboard.up('s');
  await page
    .getByRole('button', { name: 'Save expedition', exact: true })
    .click();
  await page.reload();
  await page.getByRole('button', { name: /Continue expedition/ }).click();
  await expect(page.locator('.surface-navigation')).toBeVisible({
    timeout: 15000,
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/production-excursion.png' });
  await page.getByRole('button', { name: /Board ship/ }).click();
  await page.getByRole('button', { name: /Take off/ }).click();
  await expect(page.getByRole('button', { name: /Land here/ })).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole('button', { name: /Open star chart/ }).click();
  await page
    .locator('.chart-bodies')
    .getByRole('button', { name: /Nivalis/ })
    .click();
  await page
    .getByRole('button', { name: 'Set destination →', exact: true })
    .click();
  await expect(page.locator('.navigation h2')).toHaveText('Nivalis');
  expect(workers.some((url) => url.includes('terrain.worker'))).toBe(true);
  expect(workers.some((url) => url.includes('contact.worker'))).toBe(true);
  expect(errors).toEqual([]);
});

test('production Lumen Coast entry supports a saved coastal excursion without inspection tools', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Explore Lumen Coast' })
    .click({ timeout: 45000 });
  await expect(page.locator('.flight-top')).toBeVisible();
  await page.waitForTimeout(3500);
  await page.screenshot({ path: 'test-results/production-coast-approach.png' });
  await expect(async () => {
    const land = page.getByRole('button', { name: /Land here/ });
    if (await land.isVisible()) await land.click();
    await expect(page.getByRole('button', { name: /Leave ship/ })).toBeVisible({
      timeout: 2000,
    });
  }).toPass({ timeout: 30000, intervals: [1000] });
  await page.getByRole('button', { name: /Leave ship/ }).click();
  await page.getByRole('button', { name: 'Look over Lumen Bay' }).click();
  await page.keyboard.down('w');
  await expect
    .poll(
      async () =>
        Number.parseInt(
          await page.locator('.surface-navigation .arrival b').innerText(),
        ),
      { timeout: 25000 },
    )
    .toBeGreaterThanOrEqual(28);
  await page.keyboard.up('w');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/production-coast-bay.png' });
  await page.keyboard.down('w');
  await page.waitForTimeout(1200);
  await page.keyboard.up('w');
  await page
    .getByRole('button', { name: 'Save expedition', exact: true })
    .click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('void-expedition-v2')!),
  );
  expect(saved.version).toBe(5);
  expect(saved.terrainVersion).toBe(3);
  await page.reload();
  await page
    .getByRole('button', { name: /Continue expedition/ })
    .click({ timeout: 45000 });
  await expect(
    page.getByRole('button', { name: 'Look over Lumen Bay' }),
  ).toBeVisible({ timeout: 20000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('button', { name: 'Look over Lumen Bay' }),
  ).toBeInViewport();
  await page.screenshot({ path: 'test-results/production-coast-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole('button', { name: /Board ship/ }).click();
  await page.getByRole('button', { name: /Take off/ }).click();
  await expect(page.getByRole('button', { name: /Land here/ })).toBeVisible({
    timeout: 15000,
  });
  expect(errors).toEqual([]);
});
