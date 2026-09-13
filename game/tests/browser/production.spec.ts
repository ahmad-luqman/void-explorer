import { test, expect } from '@playwright/test';
test('production export loads terrain workers and supports a complete approach', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const workers: string[] = [];
  page.on('worker', (worker) => workers.push(worker.url()));
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  await page.screenshot({ path: 'test-results/production-title.png' });
  await page.getByRole('button', { name: 'START EXPEDITION' }).click();
  await expect(page.locator('.flight-top')).toBeVisible();
  await page.getByRole('button', { name: /Descend to surface/ }).click();
  await expect(page.locator('.arrival')).toContainText('MANUAL FLIGHT', {
    timeout: 45000,
  });
  await expect(page.locator('.telemetry')).toContainText('ATMOSPHERE');
  await page.screenshot({ path: 'test-results/production-surface.png' });
  await page.getByRole('button', { name: /Open star chart/ }).click();
  await page.getByRole('button', { name: /Nivalis/ }).click();
  await expect(page.locator('.navigation h2')).toHaveText('Nivalis');
  expect(workers.some((url) => url.includes('terrain.worker'))).toBe(true);
  expect(errors).toEqual([]);
});
