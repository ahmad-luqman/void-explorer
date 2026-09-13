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
