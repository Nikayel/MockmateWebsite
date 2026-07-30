import { defineConfig } from "vitest/config"
import { resolve } from "path"

/**
 * Integration tests run against a REAL Firestore emulator — no mocks.
 *
 * The unit config (vitest.config.ts) globally stubs lib/firebase-admin and
 * next/server via vitest.setup.ts, which is exactly what these tests must not
 * have: their whole point is to exercise real queries, real composite-index
 * requirements, and real transactional/batch behavior.
 *
 * Run with:  pnpm test:integration   (starts + tears down the emulator)
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.integration.test.ts"],
    exclude: ["node_modules", ".next", "dist", "extension/**", "**/._*"],
    setupFiles: ["./vitest.integration.setup.ts"],
    // Emulator round-trips are slower than mocked calls, and these suites
    // share one Firestore instance, so keep them serial and patient.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
    },
  },
})
