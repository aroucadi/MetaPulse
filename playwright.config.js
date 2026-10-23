import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 15000,
  use: {
    baseURL: 'http://127.0.0.1:4568',
    actionTimeout: 5000,
    navigationTimeout: 10000,
    video: 'on',
  },
  webServer: {
    command: 'node server/index.js',
    port: 4568,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
    env: {
      PORT: '4568'
    }
  }
});
