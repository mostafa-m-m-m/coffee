import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3100);

/**
 * Runs against a production build:  npm run build && npm run test:e2e
 * Uses the system Chrome (no browser download). The seeded demo database must be present.
 */
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    channel: "chrome",
    locale: "ar-EG",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
      grepInvert: /@mobile/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], channel: "chrome" },
      // the drawer test is the one that matters on a phone; the flows are identical otherwise
      grep: /@mobile/,
    },
  ],
  webServer: {
    command: `npm run start -- -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    // e2e logs in dozens of times a minute; the 5/min login limiter would bounce most of them
    env: { RATE_LIMIT_DISABLED: "true", CRON_SECRET: "e2e-cron-secret" },
    timeout: 60_000,
  },
});
