import { test, expect } from '@playwright/test';
test('graded terrain and distant cloud/ring shading render in both quality modes', async ({
  page,
}) => {
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
  const state = () =>
    page.evaluate(() => window.__VOID_EXPLORER__!.state()) as Promise<{
      contactReady: boolean;
      rendererBackend: string;
    }>;
  expect((await state()).rendererBackend).toBe(backend.toUpperCase());
  const capture = async (name: string) => {
    // Hide only pause UI in review captures; the scene and its simulation stay frozen.
    const style = await page.addStyleTag({
      content:
        '[data-slot=dialog-overlay],[data-slot=dialog-content]{visibility:hidden!important}',
    });
    await page.waitForTimeout(150);
    await page.screenshot({
      path: `test-results/filter-${name}-${backend}.png`,
    });
    await style.evaluate((e) => e.parentNode?.removeChild(e));
  };
  await page.evaluate(() =>
    window.__VOID_EXPLORER__!.scene('atmospheric-flight'),
  );
  await expect.poll(async () => (await state()).contactReady).toBe(true);
  await page.waitForTimeout(1600);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.waitForTimeout(900);
  await capture('coast');
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('pulse'));
  await page.waitForTimeout(1700);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  await capture('orbit-high');
  await page.getByRole('button', { name: /Resume flight/ }).click();
  await page.keyboard.press('g');
  await page.getByLabel('Low', { exact: false }).check();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  await capture('orbit-low');
  expect(errors).toEqual([]);
});
