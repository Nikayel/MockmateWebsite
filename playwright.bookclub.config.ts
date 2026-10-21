import { defineConfig, devices } from "@playwright/test"
export default defineConfig({
  testDir: "./e2e/bookclub",
  testMatch: "bookclub.spec.ts",
  workers: 1,
  timeout: 120_000,
  reporter: "line",
  use: { baseURL: "http://127.0.0.1:3102", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node e2e/bookclub/serve.mjs",
    url: "http://127.0.0.1:3102",
    reuseExistingServer: false,
  },
})
