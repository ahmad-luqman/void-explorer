import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test('an outstanding optional ground image cannot hold the title or coastal entry', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const backend = process.env.WEBGPU_TEST ? 'webgpu' : 'webgl';
  await page.addInitScript(
    (b) => localStorage.setItem('void-renderer', b),
    backend === 'webgpu' ? 'auto' : 'webgl',
  );
  let requested = false,
    released = false;
  let release!: () => void;
  const held = new Promise<void>((r) => {
    release = r;
  });
  await page.route('**/textures/coastal-ground-v1.jpg', async (route) => {
    requested = true;
    await held;
    released = true;
    await route.fulfill({
      path: resolve('public/textures/coastal-ground-v1.jpg'),
      contentType: 'image/jpeg',
    });
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('button', { name: 'START EXPEDITION' }),
    ).toBeEnabled({ timeout: 45000 });
    await expect(page.locator('.title-top')).toContainText(
      backend.toUpperCase(),
    );
    expect(requested).toBe(true);
    expect(released).toBe(false);
    await page.getByRole('button', { name: 'Explore Lumen Coast' }).click();
    await expect(page.getByRole('button', { name: /Land here/ })).toBeVisible();
    const response = page.waitForResponse('**/textures/coastal-ground-v1.jpg');
    release();
    expect((await response).ok()).toBe(true);
    await expect(async () => {
      const land = page.getByRole('button', { name: /Land here/ });
      if (await land.isVisible()) await land.click();
      await expect(
        page.getByRole('button', { name: /Leave ship/ }),
      ).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 30000, intervals: [1000] });
    await page.getByRole('button', { name: /Leave ship/ }).click();
    await expect(
      page.getByRole('button', { name: /Board ship/ }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});
