import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    (value) => localStorage.setItem('void-renderer', value),
    process.env.WEBGPU_TEST ? 'auto' : 'webgl',
  );
});

test('remote rotating surface survives reload and reuses disk terrain', async ({
  page,
}) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const state = () =>
    page.evaluate(() => window.__VOID_EXPLORER__!.state()) as Promise<{
      system: number;
      contactReady: boolean;
      surfacePhase: string;
      surfaceShipPosition: number[];
      address: { cells: number[] };
      walked: number;
      terrainStats: {
        source: string;
        bodyId: string;
        storage: { hits: number; bytes: number };
      };
      contactStats: {
        source: string;
        storage: { hits: number; available: boolean };
      };
    }>;
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('remote-landing'));
  await expect
    .poll(async () => (await state()).contactReady, { timeout: 15000 })
    .toBe(true);
  expect((await state()).system).toBe(500);
  expect(
    Math.max(...(await state()).address.cells.map(Math.abs)),
  ).toBeGreaterThan(1000000);
  await page.getByRole('button', { name: /Land here/ }).click();
  await page
    .getByRole('button', { name: /Leave ship/ })
    .click({ timeout: 30000 });
  const parked = (await state()).surfaceShipPosition;
  await page.keyboard.down('s');
  await expect
    .poll(async () => (await state()).walked, { timeout: 15000 })
    .toBeGreaterThan(0.004);
  await page.keyboard.up('s');
  await expect
    .poll(async () => (await state()).terrainStats.bodyId, { timeout: 15000 })
    .toBe('p500-1');
  await page
    .getByRole('button', { name: 'Save expedition', exact: true })
    .click();
  await page.reload();
  await page
    .getByRole('button', { name: /Continue expedition/ })
    .click({ timeout: 45000 });
  await expect(page.locator('.surface-navigation')).toBeVisible({
    timeout: 20000,
  });
  const restored = await state();
  expect(restored.system).toBe(500);
  expect(
    Math.hypot(...restored.surfaceShipPosition.map((v, i) => v - parked[i])),
  ).toBeLessThan(1e-7);
  expect(restored.contactStats.source).toBe('disk');
  await expect
    .poll(async () => (await state()).terrainStats, { timeout: 20000 })
    .toMatchObject({ bodyId: 'p500-1', source: 'disk' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/remote-restored-surface.png' });
  await page.getByRole('button', { name: /Board ship/ }).click();
  await page.getByRole('button', { name: /Take off/ }).click();
  await expect
    .poll(async () => (await state()).surfacePhase, { timeout: 15000 })
    .toBe('flight');
  expect(errors).toEqual([]);
});

test('terrain still supports landing when worker storage is denied', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.route('**/*worker_file*', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: `Object.defineProperty(globalThis, 'indexedDB', { value: { open() { throw new DOMException('Blocked for test', 'SecurityError'); } } });\n${await response.text()}`,
    });
  });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('landing'));
  await expect
    .poll(() => page.evaluate(() => window.__VOID_EXPLORER__!.state()), {
      timeout: 20000,
    })
    .toMatchObject({
      contactReady: true,
      contactStats: { storage: { available: false } },
    });
  await page.getByRole('button', { name: /Land here/ }).click();
  await expect(page.getByRole('button', { name: /Leave ship/ })).toBeVisible({
    timeout: 30000,
  });
});

test('native IndexedDB cache enforces both LRU bounds and discards corrupt payloads', async ({
  page,
}) => {
  await page.route('**/__storage-check', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<title>Terrain storage contract</title>',
    }),
  );
  await page.goto('/__storage-check');
  const result = await page.evaluate(async () => {
    const path = '/lib/flight/terrain-storage.ts';
    const { TerrainStorage, TERRAIN_DATABASE } = await import(path);
    const cache = new TerrainStorage();
    for (let i = 0; i < 50; i++)
      await cache.write(
        'small',
        [i, 0, 0],
        { data: new Uint8Array(65536) },
        65536,
      );
    const count = cache.stats.entries;
    for (let i = 0; i < 5; i++)
      await cache.write(
        'large',
        [i, 0, 0],
        { data: new Uint8Array(8 * 1024 * 1024) },
        8 * 1024 * 1024,
      );
    const bounded = { ...cache.stats };
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open(TERRAIN_DATABASE);
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction(['metadata', 'meshes'], 'readwrite');
      const r = tx.objectStore('metadata').getAll();
      r.onsuccess = () => {
        for (const e of r.result)
          tx.objectStore('meshes').put({ broken: true }, e.key);
      };
      tx.oncomplete = () => resolve();
    });
    const hit = await cache.read(
      'large',
      () => true,
      (v: { data?: unknown }) => v?.data instanceof Uint8Array,
    );
    db.close();
    return { count, bounded, hit };
  });
  expect(result.count).toBe(48);
  expect(result.bounded.bytes).toBeLessThanOrEqual(32 * 1024 * 1024);
  expect(result.bounded.entries).toBe(4);
  expect(result.hit).toBeNull();
});

test('changing systems releases a superseded terrain request before its delayed reply', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.route('**/terrain.worker.ts?worker_file*', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: `const originalPost = self.postMessage.bind(self); let delayed = false; self.postMessage = (data, options) => { if (!delayed) { delayed = true; setTimeout(() => originalPost(data, options), 8000); } else originalPost(data, options); };\n${await response.text()}`,
    });
  });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START EXPEDITION' }),
  ).toBeEnabled({ timeout: 45000 });
  await expect
    .poll(() => page.evaluate(() => window.__VOID_EXPLORER__!.state()), {
      timeout: 5000,
    })
    .toMatchObject({ terrainPending: true });
  await page.evaluate(() => window.__VOID_EXPLORER__!.scene('remote-landing'));
  await expect
    .poll(() => page.evaluate(() => window.__VOID_EXPLORER__!.state()), {
      timeout: 20000,
    })
    .toMatchObject({
      system: 500,
      terrainStats: { bodyId: 'p500-1' },
      contactReady: true,
    });
  await expect
    .poll(() => page.evaluate(() => window.__VOID_EXPLORER__!.state()), {
      timeout: 15000,
    })
    .toMatchObject({ terrainStats: { discarded: 1, bodyId: 'p500-1' } });
});
