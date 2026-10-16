import { defineConfig, devices } from "@playwright/test"

// Real review/workspace components; local callbacks, no accounts or paid AI calls.
export default defineConfig({
  testDir: "./e2e/interview-review",
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "line",
  use: { baseURL: "http://127.0.0.1:3103", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node e2e/interview-review/serve.mjs",
    url: "http://127.0.0.1:3103",
    reuseExistingServer: !process.env.CI,
  },
})
