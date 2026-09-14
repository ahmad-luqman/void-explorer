import { expect, test } from '@playwright/test';
test('pulse flight crosses space cells and arrives at a distant real star', async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  await page.getByRole('button', { name: /SETTINGS G/ }).click();
  await page.getByLabel('Low', { exact: false }).check();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'START EXPEDITION' }).click();
  await page.getByRole('button', { name: /Open star chart/ }).click();
  await page.getByPlaceholder('Search by name…').fill('Solace 008');
  await page
    .locator('.chart-results')
    .getByRole('button', { name: /Solace 008/ })
    .click();
  await page
    .getByRole('button', { name: 'Set course & engage autopilot', exact: true })
    .click();
  await page.keyboard.press('p');
  await expect
    .poll(() => page.evaluate(() => window.__VOID_EXPLORER__!.state()), {
      timeout: 190000,
      intervals: [1000],
    })
    .toMatchObject({ system: 8, autopilot: false });
  const state = (await page.evaluate(() =>
    window.__VOID_EXPLORER__!.state(),
  )) as {
    originRevision: number;
    address: { cells: number[] };
    altitude: number;
    visited: number[];
  };
  expect(state.originRevision).toBeGreaterThan(10);
  expect(Math.max(...state.address.cells.map(Math.abs))).toBeGreaterThan(
    1000000,
  );
  expect(state.altitude).toBeGreaterThan(0);
  expect(state.altitude).toBeLessThan(2500);
  expect(state.visited).toContain(8);
  await page.screenshot({ path: 'test-results/interstellar-arrival.png' });
  expect(errors).toEqual([]);
});
