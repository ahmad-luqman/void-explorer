import { test, expect } from '@playwright/test';
test('flight streaks and atmospheric vapor respond to motion and pause', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const backend = process.env.WEBGPU_TEST ? 'webgpu' : 'webgl';
  await page.addInitScript(
    (value) => localStorage.setItem('void-renderer', value),
    backend === 'webgpu' ? 'auto' : 'webgl',
  );
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled();
  const state = () =>
    page.evaluate(() => window.__VOID_EXPLORER__!.state()) as Promise<{
      motion: { streaks: number; vapor: number; phase: number };
      rendererBackend: string;
    }>;
  expect((await state()).rendererBackend).toBe(backend.toUpperCase());
  await page.evaluate(() =>
    window.__VOID_EXPLORER__!.scene('atmospheric-flight'),
  );
  await expect
    .poll(async () => (await state()).motion.vapor)
    .toBeGreaterThan(0.08);
  await expect
    .poll(async () => (await state()).motion.streaks)
    .toBeGreaterThan(0.08);
  await page.waitForTimeout(700);
  await page.screenshot({
    path: `test-results/motion-atmosphere-${backend}.png`,
  });
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(220);
  await page.keyboard.up('ArrowLeft');
  await page.screenshot({ path: `test-results/motion-turn-${backend}.png` });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  const paused = (await state()).motion;
  await page.waitForTimeout(350);
  expect((await state()).motion).toEqual(paused);
  await page.getByRole('button', { name: /Resume flight/ }).click();
  await page.keyboard.press('g');
  await page.getByLabel('Low', { exact: false }).check();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('pulse'));
  await page.keyboard.down('w');
  await page.waitForTimeout(2000);
  await page.keyboard.up('w');
  await expect
    .poll(async () => (await state()).motion.streaks)
    .toBeGreaterThan(0.1);
  expect((await state()).motion.vapor).toBeLessThan(0.01);
  await page.screenshot({ path: `test-results/motion-pulse-${backend}.png` });
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('coastal-landing'));
  await expect.poll(async () => (await state()).motion.streaks).toBe(0);
  expect((await state()).motion.vapor).toBe(0);
  expect(errors).toEqual([]);
});
