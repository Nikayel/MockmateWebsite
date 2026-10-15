import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e/bugfix-flagship",
  testMatch: "cache-cleanup.spec.ts",
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "line",
  use: { baseURL: "http://127.0.0.1:3102", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node e2e/bugfix-flagship/serve.mjs",
    url: "http://127.0.0.1:3102",
    reuseExistingServer: false,
  },
})
