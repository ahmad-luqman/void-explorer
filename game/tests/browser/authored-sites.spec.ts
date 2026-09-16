import { test, expect } from '@playwright/test';
for (const [site, observations] of [
  ['Ember Relay', ['Split receivers', 'Memory stones', 'Last transmitter']],
  ['Glass Choir', ['Twin prisms', 'Buried seam', 'Crown cluster']],
] as const) {
  test(`${site} supports walking surveys, journal restoration and site navigation`, async ({
    page,
  }) => {
    test.setTimeout(200000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    const backend = process.env.WEBGPU_TEST ? 'webgpu' : 'webgl';
    await page.addInitScript(
      (v) => localStorage.setItem('void-renderer', v),
      backend === 'webgpu' ? 'auto' : 'webgl',
    );
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: 'START EXPEDITION' }),
    ).toBeEnabled();
    await page.getByText('More landing sites', { exact: true }).click();
    await page.getByRole('button', { name: `Explore ${site}` }).click();
    await expect(page.locator('.navigation h2')).toHaveText(site);
    await expect(async () => {
      const land = page.getByRole('button', { name: /Land here/ });
      if (await land.isVisible()) await land.click();
      await expect(
        page.getByRole('button', { name: /Leave ship/ }),
      ).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 30000, intervals: [1000] });
    await page.getByRole('button', { name: /Leave ship/ }).click();
    await expect(page.locator('.site-survey')).toContainText(site);
    await page.screenshot({
      path: `test-results/site-${site.replaceAll(' ', '-').toLowerCase()}-${backend}.png`,
    });
    for (const [index, name] of observations.entries()) {
      await page
        .getByRole('button', { name: new RegExp(`Locate ${name}`) })
        .click();
      const record = page.getByRole('button', {
        name: `Record ${name}`,
        exact: true,
      });
      await page.keyboard.down('Shift');
      await page.keyboard.down('w');
      try {
        await expect(record).toBeEnabled({ timeout: 35000 });
      } finally {
        await page.keyboard.up('w');
        await page.keyboard.up('Shift');
      }
      await record.click();
      await expect(page.locator('.site-survey')).toContainText(
        `${index + 1}/3`,
      );
      if (name === observations[0])
        await page.screenshot({
          path: `test-results/survey-${site.replaceAll(' ', '-').toLowerCase()}-${backend}.png`,
        });
    }
    await expect(page.locator('.site-survey')).toContainText('3/3');
    await page
      .getByRole('button', { name: 'Save expedition', exact: true })
      .click();
    await page.reload();
    await page
      .getByRole('button', { name: 'Continue expedition', exact: true })
      .click();
    await expect(page.locator('.site-survey')).toContainText('3/3', {
      timeout: 15000,
    });
    await page.getByRole('button', { name: 'Open expedition journal' }).click();
    const journal = page.getByRole('region', { name: 'Expedition journal' });
    await journal.locator('summary').filter({ hasText: site }).click();
    for (const name of observations)
      await expect(
        journal.getByText(`${name} · RECORDED`, { exact: true }),
      ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      journal.locator('summary').filter({ hasText: site }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await journal
      .locator('summary')
      .filter({ hasText: site })
      .scrollIntoViewIfNeeded();
    await expect
      .poll(async () => {
        const r = await page.getByRole('dialog').boundingBox();
        return !!r && r.x >= 0 && r.x + r.width <= 391;
      })
      .toBe(true);
    await page.screenshot({
      path: `test-results/journal-${site.replaceAll(' ', '-').toLowerCase()}-${backend}.png`,
    });
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.keyboard.press('Escape');
    await page
      .getByRole('button', { name: 'Locate AURORA', exact: true })
      .click();
    await page.keyboard.down('Shift');
    await page.keyboard.down('w');
    try {
      await expect
        .poll(
          async () => {
            return parseFloat(
              await page.locator('.surface-navigation .range').innerText(),
            );
          },
          { timeout: 35000 },
        )
        .toBeLessThan(50);
    } finally {
      await page.keyboard.up('w');
      await page.keyboard.up('Shift');
    }
    await page.getByRole('button', { name: /Board ship/ }).click();
    await page.getByRole('button', { name: /Take off/ }).click();
    await expect(page.getByRole('button', { name: /Land here/ })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('button', { name: /Open star chart/ }).click();
    await page
      .getByRole('region', { name: 'Expedition journal' })
      .locator('summary')
      .filter({ hasText: site })
      .click();
    await page
      .getByRole('button', { name: `Navigate to ${site}`, exact: true })
      .click();
    await expect(page.locator('.arrival')).toContainText('MANUAL FLIGHT', {
      timeout: 30000,
    });
    await expect(page.locator('.navigation')).toContainText(
      'Landing site reached',
    );
    expect(errors).toEqual([]);
  });
}
