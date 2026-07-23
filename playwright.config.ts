import { defineConfig, devices } from "@playwright/test";

/**
 * QA config for the "Portal" scroll-driven WebGL landing (feat/portal-experience).
 * Assumes `bun dev` (or preview) is already running at PORT — we do not manage the
 * dev server here so QA can point at whatever instance is up.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.QA_BASE_URL ?? "http://localhost:3005",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } },
    },
  ],
});
