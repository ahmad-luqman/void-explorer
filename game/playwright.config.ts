import { defineConfig } from '@playwright/test';
const browserName =
  process.env.PLAYWRIGHT_BROWSER === 'firefox'
    ? 'firefox'
    : process.env.PLAYWRIGHT_BROWSER === 'webkit'
      ? 'webkit'
      : 'chromium';
export default defineConfig({
  testDir: 'tests/browser',
  timeout: 60000,
  workers: 1,
  use: {
    browserName,
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    viewport: { width: 1440, height: 960 },
    launchOptions: {
      args:
        browserName === 'chromium'
          ? [
              ...(process.env.HARDWARE_TEST
                ? ['--use-angle=metal']
                : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']),
              ...(process.env.WEBGPU_TEST && !process.env.HARDWARE_TEST
                ? ['--enable-unsafe-webgpu']
                : []),
            ]
          : [],
    },
  },
  reporter: 'list',
});
