import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    // *.integration.test.ts needs a live Firestore emulator and must NOT run
    // under this config (which globally mocks firebase-admin). See
    // vitest.integration.config.ts / `pnpm test:integration`.
    exclude: [
      "node_modules",
      ".next",
      "dist",
      "extension/**",
      "**/._*",
      "**/*.integration.test.ts",
      // Other branches' checkouts, mounted as sibling worktrees under .claude/.
      // The bare patterns above only match at the repo root, so a worktree's
      // own nested node_modules (e.g. tsconfig-paths' bundled test suite) was
      // getting collected and run as if it were this branch's source.
      ".claude/worktrees/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["lib/**/*.ts", "app/api/**/*.ts"],
      exclude: [
        "lib/scenarios.ts", // Large data file
        "lib/scenarios-*.ts",
        "**/*.test.ts",
        "**/types.ts",
      ],
    },
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
    },
  },
})
