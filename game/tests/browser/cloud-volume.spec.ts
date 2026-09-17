import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('cloud volumes render close, inside and at night in both quality modes', async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  const backend = process.env.WEBGPU_TEST ? 'webgpu' : 'webgl',
    errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.addInitScript(
    (v) => localStorage.setItem('void-renderer', v),
    backend === 'webgpu' ? 'auto' : 'webgl',
  );
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled();
  const records = [];
  for (const name of [
    'atmospheric-flight',
    'cloud-close',
    'cloud-inside',
    'cloud-rotated',
    'night',
  ]) {
    await page.evaluate((name) => window.__VOID_EXPLORER__!.scene(name), name);
    await page.waitForTimeout(1200);
    const data = await page.evaluate(async () => {
      const times: number[] = [];
      let start = 0,
        last = 0;
      await new Promise<void>((resolve) => {
        const frame = (t: number) => {
          if (!start) start = t;
          if (last) times.push(t - last);
          last = t;
          if (t - start < 5000) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
      times.sort((a, b) => a - b);
      return {
        frames: times.length,
        p95: times[Math.floor(times.length * 0.95)],
        p99: times[Math.floor(times.length * 0.99)],
        max: times.at(-1),
        state: window.__VOID_EXPLORER__!.state(),
      };
    });
    records.push({ name, ...data });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeVisible();
    const style = await page.addStyleTag({
      content:
        '[data-slot=dialog-overlay],[data-slot=dialog-content]{visibility:hidden!important}',
    });
    await page.waitForTimeout(250);
    await page.screenshot({
      path: `test-results/volume-${name}-${backend}.png`,
    });
    await style.evaluate((e) => e.parentNode?.removeChild(e));
  }
  await page.getByRole('button', { name: /Resume flight/ }).click();
  await page.keyboard.press('g');
  await page.getByLabel('Low', { exact: false }).check();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('cloud-close'));
  await page.waitForTimeout(1200);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window.__VOID_EXPLORER__!.state() as { cloudDetail: number })
            .cloudDetail,
      ),
    )
    .toBe(0);
  await page.screenshot({
    path: `test-results/volume-close-low-${backend}.png`,
  });
  // Exercise disposal of the shared atlas/material and recreation on return.
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('remote-landing'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('cloud-close'));
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
  await writeFile(
    `test-results/volume-${backend}.json`,
    JSON.stringify(
      {
        date: new Date().toISOString(),
        browser: browser.version(),
        backend,
        viewport: { width: 1440, height: 960 },
        records,
      },
      null,
      2,
    ),
  );
});
