import { defineConfig } from '@playwright/test'
export default defineConfig({
  globalTeardown: './tests/cita-global-teardown.js',
  testDir: './tests', testMatch: 'mi-cita.spec.js', fullyParallel: false, workers: 1, timeout: 30000, reporter: 'list',
  use: { baseURL: 'http://localhost:5175', channel: 'chrome', headless: true, screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    { command: 'node ../api/citas/ui-server.cjs', url: 'http://127.0.0.1:3002/api/health', timeout: 60000, reuseExistingServer: false, gracefulShutdown: { signal: 'SIGTERM', timeout: 15000 } },
    { command: 'npm run dev -- --host localhost --port 5175 --strictPort', url: 'http://localhost:5175', timeout: 30000, reuseExistingServer: false, env: { VITE_API_URL: 'http://127.0.0.1:3002' } },
  ],
})
