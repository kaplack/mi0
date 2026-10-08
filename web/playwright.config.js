import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  testIgnore: 'mi-cita.spec.js',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5173', channel: 'chrome', headless: true, screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
