import { defineConfig, devices } from "@playwright/test"

/** Browser regressions without credentials, production routes, or paid AI calls. */
export default defineConfig({
  testDir: "./e2e/recommendations",
  testMatch: "next-practice.spec.ts",
  // The shared Vite/SSR fixture is small; serial navigation avoids reload contention.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "line",
  use: { baseURL: "http://127.0.0.1:3101", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node e2e/recommendations/serve.mjs",
    url: "http://127.0.0.1:3101",
    reuseExistingServer: !process.env.CI,
  },
})
