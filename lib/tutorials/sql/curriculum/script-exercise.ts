import type { SqlExercise } from "@/lib/tutorials/types"

/**
 * Build a workspace `SqlExercise` — one editable `solution.sql` the learner writes, plus grading.
 * Shared by every L3/L4 workspace lesson so the shape stays identical across the course.
 *
 * Workspace grading: the learner's multi-statement script runs against a fresh seeded SQLite DB, then
 * hidden **assertion queries** run — each returns the OFFENDING rows, so zero rows = pass (the dbt
 * "count of violations = 0" convention) — and `checkIdempotency` re-runs the script to assert a stable
 * row count. The runner emits the byte-identical `__WORKSPACE_TEST_RESULTS__:` marker.
 */
export function scriptExercise(input: {
  id: string
  prompt: string
  starterCode: string
  hints: string[]
  referenceSolution?: string
  seedSql: string
  assertions: NonNullable<SqlExercise["workspace"]>["assertions"]
  checkIdempotency?: boolean
}): SqlExercise {
  return {
    id: input.id,
    executionMode: "workspace",
    prompt: input.prompt,
    starterCode: input.starterCode,
    hints: input.hints,
    referenceSolution: input.referenceSolution,
    workspace: {
      language: "sql",
      primaryFilePath: "solution.sql",
      editableFilePaths: ["solution.sql"],
      // Vestigial for SQL (assertions are hidden queries, not files) but required by the shared
      // WorkspaceScenarioConfig contract the reused WorkspaceExerciseRunner renders.
      testRunnerPath: "solution.sql",
      visibleTestPaths: [],
      hiddenTestPaths: [],
      files: [
        {
          path: "solution.sql",
          content: input.starterCode,
          role: "editable",
          language: "sql",
        },
      ],
      seedSql: input.seedSql,
      assertions: input.assertions,
      checkIdempotency: input.checkIdempotency,
    },
  }
}
