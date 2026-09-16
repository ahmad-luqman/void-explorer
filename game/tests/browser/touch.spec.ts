import { expect, test, type Locator } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
test('touch steering, throttle, pulse and walking complete a saved excursion', async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem('void-renderer', 'webgl'),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'START EXPEDITION' }).tap();
  const client = await context.newCDPSession(page);
  const touches = new Map<number, { x: number; y: number; id: number }>();
  const send = (type: 'touchStart' | 'touchEnd' | 'touchCancel') =>
    client.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: [...touches.values()],
    });
  const center = async (locator: Locator) => {
    const b = await locator.boundingBox();
    expect(b).not.toBeNull();
    return { x: b!.x + b!.width / 2, y: b!.y + b!.height / 2 };
  };
  const down = async (id: number, point: { x: number; y: number }) => {
    touches.set(id, { ...point, id });
    await send('touchStart');
  };
  const up = async (id: number) => {
    touches.delete(id);
    await send('touchEnd');
  };
  const state = () =>
    page.evaluate(() => window.__VOID_EXPLORER__!.state()) as Promise<{
      throttle: number;
      pulse: boolean;
      orientation: number[];
      walked: number;
      surfacePhase: string;
      contactReady: boolean;
    }>;
  const before = await state();
  const steer = await center(
    page.getByRole('button', { name: 'Steer spacecraft' }),
  );
  await down(1, { x: steer.x + 28, y: steer.y });
  await down(
    2,
    await center(
      page.getByRole('button', { name: 'Increase throttle', exact: true }),
    ),
  );
  await expect.poll(async () => (await state()).throttle).toBeGreaterThan(0.12);
  expect((await state()).orientation).not.toEqual(before.orientation);
  touches.clear();
  await send('touchCancel');
  const released = (await state()).throttle;
  await page.waitForTimeout(250);
  expect((await state()).throttle).toBeCloseTo(released, 2);
  await page.getByRole('button', { name: 'Toggle pulse travel' }).tap();
  await expect.poll(async () => (await state()).pulse).toBe(true);
  await page.getByRole('button', { name: 'Toggle pulse travel' }).tap();
  await expect.poll(async () => (await state()).pulse).toBe(false);
  await page.screenshot({ path: 'test-results/touch-flight-portrait.png' });
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('coastal-landing'));
  await expect.poll(async () => (await state()).contactReady).toBe(true);
  await page.getByRole('button', { name: /Land here/ }).tap();
  await expect(page.getByRole('button', { name: /Leave ship/ })).toBeVisible({
    timeout: 25000,
  });
  await page.getByRole('button', { name: /Leave ship/ }).tap();
  const move = await center(page.getByRole('button', { name: 'Move on foot' }));
  await down(1, { x: move.x, y: move.y + 34 });
  await down(
    2,
    await center(page.getByRole('button', { name: 'Run', exact: true })),
  );
  await expect.poll(async () => (await state()).walked).toBeGreaterThan(0.005);
  await up(2);
  await up(1);
  const stopped = (await state()).walked;
  await page.waitForTimeout(250);
  expect((await state()).walked).toBeCloseTo(stopped, 5);
  await page
    .getByRole('button', { name: 'Save expedition', exact: true })
    .tap();
  await page.reload();
  await page
    .getByRole('button', { name: 'Continue expedition', exact: true })
    .tap();
  await expect(page.getByRole('button', { name: 'Move on foot' })).toBeEnabled({
    timeout: 20000,
  });
  await page.screenshot({ path: 'test-results/touch-surface-portrait.png' });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(
    page.getByRole('button', { name: 'Move on foot' }),
  ).toBeInViewport();
  await page.screenshot({ path: 'test-results/touch-surface-landscape.png' });
  await page.getByRole('button', { name: /Board ship/ }).tap();
  await page.getByRole('button', { name: /Take off/ }).tap();
  await expect(
    page.getByRole('button', { name: 'Steer spacecraft' }),
  ).toBeEnabled({ timeout: 10000 });
  expect(errors).toEqual([]);
});
