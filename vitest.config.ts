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
    //
    // workbooks/** holds AUTHORED Sprint Labs content (docs/sprint-labs/
    // WORKBOOK-SPEC.md §6): each ticket's tests/visible/*.test.ts is a real
    // vitest-shaped file, but it is meant to run inside the learner's
    // workspace via the TS-workspace runner (docs/sprint-labs/PLAN.md Task
    // 4/7), against files that only exist in a provisioned workspace or
    // seed repo. It is not part of THIS app's own module graph (its imports
    // like "../../../src/http/claims-parser" resolve only inside a
    // provisioned workspace), so it must never be picked up by this
    // project's own `pnpm test`.
    //
    // lib/sprint-labs/validate/dynamic/__tests__/fixtures/** is the SAME
    // shape of problem, one directory later: Task 7's own dynamic-gate test
    // fixtures (small standalone workbooks, not workbooks/_fixture-workbook)
    // also author real tests/visible/*.test.ts content that is only ever
    // fed to runTsWorkspace as in-memory strings inside a materialized git
    // temp dir -- never meant to be discovered and run directly here either.
    exclude: [
      "node_modules",
      ".next",
      "dist",
      "extension/**",
      "**/._*",
      "**/*.integration.test.ts",
      "workbooks/**",
      "lib/sprint-labs/validate/dynamic/__tests__/fixtures/**",
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
