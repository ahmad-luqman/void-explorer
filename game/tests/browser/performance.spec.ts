import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('measure rendered frame pacing in orbital and coastal flight', async ({
  page,
  browser,
}, info) => {
  test.skip(
    !process.env.PERFORMANCE_TEST,
    'Opt-in hardware measurement; do not compare concurrent GPU runs.',
  );
  test.setTimeout(120000);
  await page.addInitScript(
    (renderer) => localStorage.setItem('void-renderer', renderer),
    process.env.WEBGPU_TEST ? 'auto' : 'webgl',
  );
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  const backend = await page.locator('.title-top').innerText();
  const measure = async () =>
    page.evaluate(
      () =>
        new Promise<{
          samples: number;
          median: number;
          p95: number;
          p99: number;
          maximum: number;
          over50ms: number;
        }>((resolve) => {
          const frames: number[] = [];
          let last = 0,
            start = 0;
          const frame = (now: number) => {
            if (!start) start = now;
            if (last) frames.push(now - last);
            last = now;
            if (now - start < 6000) {
              requestAnimationFrame(frame);
              return;
            }
            frames.sort((a, b) => a - b);
            const percentile = (p: number) =>
              Number(frames[Math.floor((frames.length - 1) * p)].toFixed(2));
            resolve({
              samples: frames.length,
              median: percentile(0.5),
              p95: percentile(0.95),
              p99: percentile(0.99),
              maximum: percentile(1),
              over50ms: frames.filter((v) => v > 50).length,
            });
          };
          requestAnimationFrame(frame);
        }),
    );
  const results: Record<string, Awaited<ReturnType<typeof measure>>> = {};
  await page.getByRole('button', { name: 'START EXPEDITION' }).click();
  await page.waitForTimeout(3500);
  results.orbitHigh = await measure();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Return to title' }).click();
  await page.getByRole('button', { name: 'Explore Lumen Coast' }).click();
  await page.waitForTimeout(5000);
  results.coastHigh = await measure();
  await page.keyboard.press('g');
  await page.getByLabel('Low', { exact: false }).check();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.waitForTimeout(1500);
  results.coastLow = await measure();
  const device = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    threads: navigator.hardwareConcurrency,
    devicePixelRatio,
    width: innerWidth,
    height: innerHeight,
  }));
  const report = {
    date: new Date().toISOString(),
    browser: browser.version(),
    backend,
    device,
    results,
  };
  await info.attach('frame-pacing.json', {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  });
  await writeFile(
    `test-results/frame-pacing-${process.env.WEBGPU_TEST ? 'webgpu' : 'webgl'}.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
  for (const sample of Object.values(results))
    expect(sample.samples).toBeGreaterThan(30);
});
