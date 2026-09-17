import { expect, test } from '@playwright/test';

test('coastal shallows render animated water and retain depth through cache restoration', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.addInitScript(
    (backend) => localStorage.setItem('void-renderer', backend),
    process.env.WEBGPU_TEST ? 'auto' : 'webgl',
  );
  await page.goto('/');
  await expect(page.locator('.title-top')).toContainText(
    process.env.WEBGPU_TEST ? 'WEBGPU' : 'WEBGL',
    { timeout: 45000 },
  );
  await page.getByRole('button', { name: 'START EXPEDITION' }).click();
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('coastal-shore'));
  const state = () =>
    page.evaluate(() => window.__VOID_EXPLORER__!.state()) as Promise<{
      contactReady: boolean;
      contactStats: { source: string; bytes: number };
    }>;
  // Readiness is a worker/first-shader correctness gate, not a 5 s load-time budget.
  await expect
    .poll(async () => (await state()).contactReady, { timeout: 20000 })
    .toBe(true);
  expect((await state()).contactStats.bytes).toBeLessThan(6 * 1024 * 1024);
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: `test-results/shoreline-${process.env.WEBGPU_TEST ? 'webgpu' : 'webgl'}.png`,
  });
  // This fixed shore view puts water above the ship. Exclude its moving exhaust
  // as well as UI, so engine animation cannot satisfy the wave check.
  const sample = (region = [0.4, 0.3, 0.2, 0.2]) =>
    page.evaluate(
      ([x, y, width, height]) =>
        new Promise<number[]>((resolve) =>
          requestAnimationFrame(() => {
            const source = document.querySelector(
              '.space-canvas canvas',
            ) as HTMLCanvasElement;
            const canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 90;
            const context = canvas.getContext('2d')!;
            context.drawImage(
              source,
              source.width * x,
              source.height * y,
              source.width * width,
              source.height * height,
              0,
              0,
              160,
              90,
            );
            resolve([...context.getImageData(0, 0, 160, 90).data]);
          }),
        ),
      region,
    );
  const first = await sample();
  await page.waitForTimeout(500);
  const next = await sample();
  expect(
    next.filter((v, i) => Math.abs(v - first[i]) > 2).length,
  ).toBeGreaterThan(50);
  // Away from the solar reflection, the ocean retains teal diffuse color.
  // Applying terrain vertex colors twice made this patch almost black on WebGPU.
  const offshore = await sample([0.8, 0.4, 0.1, 0.1]);
  const green = offshore.filter((_, i) => i % 4 === 1);
  expect(green.reduce((sum, v) => sum + v, 0) / green.length).toBeGreaterThan(
    25,
  );
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Save expedition', exact: true })
    .click();
  await page.reload();
  await page
    .getByRole('button', { name: 'Continue expedition', exact: true })
    .click();
  await expect
    .poll(async () => (await state()).contactStats.source)
    .toBe('disk');
  // Readiness is a worker/first-shader correctness gate, not a 5 s load-time budget.
  await expect
    .poll(async () => (await state()).contactReady, { timeout: 20000 })
    .toBe(true);
  expect(errors).toEqual([]);
});
