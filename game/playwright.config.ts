import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/browser',
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    viewport: { width: 1440, height: 960 },
    launchOptions: {
      args: [
        ...(process.env.HARDWARE_TEST
          ? ['--use-angle=metal']
          : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']),
        ...(process.env.WEBGPU_TEST ? ['--enable-unsafe-webgpu'] : []),
      ],
    },
  },
  reporter: 'list',
});
