import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('measure sustained cold and cached surface streaming', async ({
  page,
  browser,
}, info) => {
  test.skip(
    !process.env.PERFORMANCE_TEST,
    'Opt-in hardware run; keep other GPU tests stopped.',
  );
  test.setTimeout(180000);
  const duration = Number(process.env.STREAMING_SECONDS || 30) * 1000;
  const backend = process.env.WEBGPU_TEST ? 'webgpu' : 'webgl';
  await page.addInitScript(
    (v) => localStorage.setItem('void-renderer', v),
    backend === 'webgpu' ? 'auto' : 'webgl',
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  await expect(page.locator('.title-top')).toContainText(backend.toUpperCase());
  const runs = [];
  for (const cache of ['cold', 'revisit']) {
    await page.evaluate(() =>
      window.__VOID_EXPLORER__!.scene('surface-traverse'),
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window.__VOID_EXPLORER__!.state() as { contactReady: boolean })
              .contactReady,
        ),
      )
      .toBe(true);
    await page.waitForTimeout(1800);
    await page.evaluate(() => window.__VOID_EXPLORER__!.resetStreaming());
    await page.keyboard.down('w');
    const result = await page.evaluate(
      (duration) =>
        new Promise<{
          frames: {
            count: number;
            p50: number;
            p95: number;
            p99: number;
            max: number;
            over50: number;
          };
          start: Record<string, unknown>;
          end: Record<string, unknown>;
          samples: Record<string, unknown>[];
        }>((resolve) => {
          const api = window.__VOID_EXPLORER__!;
          const start = structuredClone(api.state()) as Record<string, unknown>;
          const frames: number[] = [],
            samples: Record<string, unknown>[] = [];
          let began = 0,
            last = 0,
            sampled = 0;
          const tick = (now: number) => {
            if (!began) began = now;
            if (last) frames.push(now - last);
            last = now;
            if (now - sampled > 2000) {
              const s = api.state() as Record<string, unknown>;
              samples.push({
                elapsed: now - began,
                speed: s.speed,
                altitude: s.altitude,
                message: s.flightMessage,
                contact: s.contactStats,
                terrain: s.terrainStats,
              });
              sampled = now;
            }
            if (now - began < duration) {
              requestAnimationFrame(tick);
              return;
            }
            frames.sort((a, b) => a - b);
            const p = (v: number) =>
              frames[Math.floor((frames.length - 1) * v)];
            resolve({
              frames: {
                count: frames.length,
                p50: p(0.5),
                p95: p(0.95),
                p99: p(0.99),
                max: p(1),
                over50: frames.filter((x) => x > 50).length,
              },
              start,
              end: api.state() as Record<string, unknown>,
              samples,
            });
          };
          requestAnimationFrame(tick);
        }),
      duration,
    );
    await page.keyboard.up('w');
    await page.keyboard.down('x');
    await page.waitForTimeout(500);
    await page.keyboard.up('x');
    runs.push({ cache, ...result });
  }
  const report = {
    date: new Date().toISOString(),
    browser: browser.version(),
    backend,
    device: await page.evaluate(() => ({
      agent: navigator.userAgent,
      threads: navigator.hardwareConcurrency,
      dpr: devicePixelRatio,
      width: innerWidth,
      height: innerHeight,
    })),
    runs,
  };
  const path = `test-results/streaming-${process.env.STREAMING_LABEL || 'current'}-${backend}.json`;
  await writeFile(path, JSON.stringify(report, null, 2));
  await info.attach('streaming.json', {
    path,
    contentType: 'application/json',
  });
  for (const r of runs) {
    const a = r.start.surfacePosition as number[],
      b = r.end.surfacePosition as number[];
    const distance = Math.hypot(...b.map((x, i) => x - a[i]));
    const contacts =
      (r.end.contactStats as { generated: number }).generated -
      (r.start.contactStats as { generated: number }).generated;
    console.log(
      JSON.stringify({
        cache: r.cache,
        frames: r.frames,
        distance,
        contacts,
        message: r.end.flightMessage,
        streaming: r.end.streaming,
      }),
    );
    expect(distance).toBeGreaterThan(duration >= 30000 ? 3 : 1);
    expect(contacts).toBeGreaterThanOrEqual(4);
    expect(r.end.flightMessage).toBe('');
    if (duration === 10000 && r.cache === 'revisit') {
      const before = r.start.contactStats as { storage: { hits: number } };
      const after = r.end.contactStats as { storage: { hits: number } };
      expect(after.storage.hits - before.storage.hits).toBeGreaterThanOrEqual(
        3,
      );
    }
  }
  expect(errors).toEqual([]);
});
