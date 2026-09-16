import { expect, test } from '@playwright/test';

test('plan, reorder, save and fly a route through its first arrival', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.addInitScript(
    (backend) => localStorage.setItem('void-renderer', backend),
    process.env.WEBGPU_TEST ? 'auto' : 'webgl',
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'START EXPEDITION' }).click();
  await page.keyboard.press('Tab');
  await page.getByRole('button', { name: 'Add to route', exact: true }).click();
  await page
    .getByRole('button', { name: 'Inspect Ember Reach', exact: true })
    .click();
  await page.getByRole('button', { name: 'Add to route', exact: true }).click();
  const route = page.getByLabel('Planned route');
  await expect(route.locator('li')).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Move Ember Reach earlier' }).click();
  await page.screenshot({ path: 'test-results/planned-route-mobile.png' });
  await expect(route.locator('li').first()).toContainText('Ember Reach');
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole('button', { name: 'Move Ember Reach later' }).click();
  await expect(route.locator('li').first()).toContainText('Aurelia Veil');
  await page.screenshot({ path: 'test-results/planned-route.png' });
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('void-expedition-v2')!).route,
  );
  expect(saved).toEqual(['p0-0', 'p0-1']);
  await page.getByRole('button', { name: 'Fly planned route' }).click();
  await expect(page.locator('.route-guidance')).toContainText('ROUTE ACTIVE');
  await expect(page.locator('.navigation h2')).toHaveText('Ember Reach', {
    timeout: 40000,
  });
  await expect(page.locator('.route-guidance')).toContainText(
    '1 stop remaining',
  );
  await page.keyboard.down('x');
  await expect(page.locator('.route-guidance')).toContainText('ROUTE PAUSED');
  await page.keyboard.up('x');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Save expedition', exact: true })
    .click();
  await page.reload();
  await page
    .getByRole('button', { name: 'Continue expedition', exact: true })
    .click();
  await expect(page.locator('.route-guidance')).toContainText('ROUTE PAUSED');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Planned route').locator('li')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Remove Ember Reach from route' })
    .click();
  await expect(page.getByLabel('Planned route').locator('li')).toHaveCount(0);
  expect(errors).toEqual([]);
});
