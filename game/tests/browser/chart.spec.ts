import { test, expect } from '@playwright/test';
test('inspect maps, search a remote system, select its planet, and engage a course', async ({
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
  await page.getByRole('button', { name: 'START EXPEDITION' }).click();
  const before = (await page.evaluate(() =>
    window.__VOID_EXPLORER__!.state(),
  )) as { position: number[]; target: string };
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Local system map')).toBeVisible();
  await page
    .getByRole('button', { name: 'Inspect Ember Reach', exact: true })
    .click();
  await expect(page.locator('.chart-details h3')).toHaveText('Ember Reach');
  expect(
    await page.evaluate(() => window.__VOID_EXPLORER__!.state()),
  ).toMatchObject({ position: before.position, target: before.target });
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(page.locator('.chart-zoom')).toContainText('1.4×');
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  const map = page.getByLabel('Local system map'),
    mark = page.getByRole('button', {
      name: 'Inspect Ember Reach',
      exact: true,
    });
  const original = await mark.getAttribute('transform'),
    box = (await map.boundingBox())!;
  await page.mouse.move(box.x + 25, box.y + 90);
  await page.mouse.down();
  await page.mouse.move(box.x + 65, box.y + 120);
  await page.mouse.up();
  await expect(mark).not.toHaveAttribute('transform', original!);
  await page.mouse.wheel(0, -200);
  await expect(page.locator('.chart-zoom')).toContainText('1.2×');
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  await page.screenshot({ path: 'test-results/system-chart.png' });
  await page.getByRole('button', { name: 'Galaxy', exact: true }).click();
  await expect(page.getByLabel('Galaxy star map')).toBeVisible();
  await page.screenshot({ path: 'test-results/galaxy-chart.png' });
  await page.getByPlaceholder('Search by name…').fill('Orison 001');
  await page
    .locator('.chart-results')
    .getByRole('button', { name: /Orison 001/ })
    .click();
  await expect(page.locator('.chart-details h3')).toHaveText('Orison 001');

  await page.getByRole('button', { name: /Explore system/ }).click();
  await page
    .locator('.chart-bodies')
    .getByRole('button', { name: /Orison 001 c/ })
    .click();
  await page
    .getByRole('button', { name: 'Set course & engage autopilot', exact: true })
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.navigation h2')).toHaveText('Orison 001 c');
  await expect
    .poll(
      async () => await page.evaluate(() => window.__VOID_EXPLORER__!.state()),
    )
    .toMatchObject({ target: 'p1-1', autopilot: true });
  expect(errors).toEqual([]);
});
test('chart supports keyboard focus and small-screen destination selection', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  await page.getByRole('button', { name: 'START EXPEDITION' }).click();
  await page.keyboard.press('Tab');
  const first = page.getByRole('button', { name: 'System', exact: true });
  await first.focus();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Galaxy', exact: true }),
  ).toBeFocused();
  await page
    .locator('.chart-bodies')
    .getByRole('button', { name: /Nivalis/ })
    .click();
  await page
    .getByRole('button', { name: 'Set destination →', exact: true })
    .click();
  await expect(page.locator('.navigation h2')).toHaveText('Nivalis');
});
