import { defineConfig, devices } from "@playwright/test";

/**
 * Accessibility pass over the design system: every story, in light and dark, in English and
 * Arabic, scanned by axe. Needs `npm run build-storybook` first; serves the static build itself.
 */
export default defineConfig({
  testDir: "tests/storybook",
  timeout: 30_000,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:6007", channel: "chrome", ...devices["Desktop Chrome"] },
  webServer: {
    command: "npx http-server storybook-static -p 6007 -s",
    url: "http://localhost:6007",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
