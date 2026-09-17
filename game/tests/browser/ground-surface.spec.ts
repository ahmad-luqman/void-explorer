import { test, expect } from '@playwright/test';

for (const fallback of [false, true])
  test(`coastal ground and foreground render with ${fallback ? 'fallback' : 'loaded'} albedo`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    const backend = process.env.WEBGPU_TEST ? 'webgpu' : 'webgl';
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (
        m.type() === 'error' &&
        !(fallback && m.text().includes('net::ERR_FAILED'))
      )
        errors.push(m.text());
    });
    await page.addInitScript(
      (v) => localStorage.setItem('void-renderer', v),
      backend === 'webgpu' ? 'auto' : 'webgl',
    );
    if (fallback)
      await page.route('**/textures/coastal-ground-v1.jpg', (route) =>
        route.abort(),
      );
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: 'START EXPEDITION' }),
    ).toBeEnabled({ timeout: 45000 });
    await expect(page.locator('.title-top')).toContainText(
      backend.toUpperCase(),
    );
    await page
      .getByRole('button', { name: 'Explore Lumen Coast' })
      .click({ timeout: 45000 });
    await expect(async () => {
      const land = page.getByRole('button', { name: /Land here/ });
      if (await land.isVisible()) await land.click();
      await expect(
        page.getByRole('button', { name: /Leave ship/ }),
      ).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 30000, intervals: [1000] });
    await page.getByRole('button', { name: /Leave ship/ }).click();
    const capture = async (view: string) => {
      await page.waitForTimeout(700);
      await page.screenshot({
        path: `test-results/ground-${fallback ? 'fallback' : 'loaded'}-${view}-${backend}.png`,
      });
    };
    await capture('ship');
    await page.getByRole('button', { name: 'Look over Lumen Bay' }).click();
    await page.keyboard.down('w');
    try {
      await expect
        .poll(
          async () =>
            Number.parseInt(
              await page.locator('.surface-navigation .arrival b').innerText(),
            ),
          { timeout: 30000 },
        )
        .toBeGreaterThanOrEqual(28);
    } finally {
      await page.keyboard.up('w');
    }
    await capture('bay');
    if (!fallback) {
      await page.keyboard.down('ArrowLeft');
      await page.waitForTimeout(650);
      await page.keyboard.up('ArrowLeft');
      await capture('left');
      await page.getByRole('button', { name: 'Look over Lumen Bay' }).click();
      await page.keyboard.press('g');
      await page.getByLabel('Low', { exact: false }).check();
      await page.getByRole('button', { name: 'Done', exact: true }).click();
      await capture('low');
    }
    expect(errors).toEqual([]);
  });
