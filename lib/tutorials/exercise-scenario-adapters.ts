/**
 * Pure adapters from an authored tutorial exercise (Python OR SQL) to the `Scenario` the client-side
 * executor consumes. **No curriculum-registry imports** live here, so the client run path
 * (`useExerciseRun`) can build a run Scenario from the exercise object it already holds without
 * dragging either full curriculum registry (~1.3 MB of authored content, incl. hidden assertions) into
 * the browser bundle. The id-based lookup that DOES touch the registries stays in `exercise-scenarios.ts`.
 *
 * Only a SUBSET of `Scenario` is read at runtime:
 *  - Python single-file → `{ id, type: "dsa", testCases }`.
 *  - Python workspace   → `{ id, executionMode: "workspace", workspace }`.
 *  - SQL single-file    → `{ id, type: "dsa", language: "sql", seedSql, testCases: [{ expected }] }`
 *    (the executor dispatches on the scenario's `language` and `executeSqlClientSide` reads `seedSql`).
 *  - SQL workspace      → `{ id, executionMode: "workspace", workspace }` where `workspace` carries
 *    `language: "sql"` + `seedSql` + `assertions` (the SqlWorkspaceGrading).
 *
 * Because the rest of a real `Scenario` (pattern, complexity, examples, …) is meaningless for a
 * tutorial, we synthesize an execution-only object and assert it with a single documented
 * `as unknown as Scenario` cast rather than inventing fake fields.
 */
import type { Scenario } from "@/lib/scenarios"
import type { PythonExercise, SqlExercise } from "./types"

function toSingleFileScenario(exercise: PythonExercise): Scenario {
  return {
    id: exercise.id,
    type: "dsa",
    title: exercise.id,
    difficulty: "easy",
    companies: [],
    description: exercise.prompt,
    tags: [],
    estimatedTime: 0,
    testCases: exercise.testCases ?? [],
  } as unknown as Scenario
}

function toWorkspaceScenario(
  exercise: PythonExercise,
  workspace: NonNullable<PythonExercise["workspace"]>
): Scenario {
  return {
    id: exercise.id,
    type: "add-functionality",
    executionMode: "workspace",
    workspace,
    title: exercise.id,
    difficulty: "medium",
    companies: [],
    description: exercise.prompt,
    tags: [],
    estimatedTime: 0,
  } as unknown as Scenario
}

/** SQL single-file: a DSA-shaped scenario carrying `language: "sql"`, the seed DB, and one expected set. */
function toSqlSingleFileScenario(
  exercise: SqlExercise,
  grading: NonNullable<SqlExercise["singleFile"]>
): Scenario {
  return {
    id: exercise.id,
    type: "dsa",
    language: "sql",
    executionMode: "single-file",
    seedSql: grading.seedSql,
    caseInsensitive: grading.caseInsensitive,
    testCases: [
      {
        input: {},
        expected: grading.expected,
        description: "Result set matches the expected output",
        orderMatters: grading.orderMatters,
        caseInsensitive: grading.caseInsensitive,
        assertColumnNames: grading.assertColumnNames,
      },
    ],
    title: exercise.id,
    difficulty: "easy",
    companies: [],
    description: exercise.prompt,
    tags: [],
    estimatedTime: 0,
  } as unknown as Scenario
}

/** SQL workspace: the workspace config already carries `language: "sql"` + `seedSql` + `assertions`. */
function toSqlWorkspaceScenario(
  exercise: SqlExercise,
  workspace: NonNullable<SqlExercise["workspace"]>
): Scenario {
  return {
    id: exercise.id,
    type: "add-functionality",
    executionMode: "workspace",
    language: "sql",
    workspace,
    title: exercise.id,
    difficulty: "medium",
    companies: [],
    description: exercise.prompt,
    tags: [],
    estimatedTime: 0,
  } as unknown as Scenario
}

/**
 * Tell a SQL exercise from a Python one by its grading payload: SQL single-file exercises carry
 * `singleFile`, and SQL workspaces carry `language: "sql"` on the workspace config. Python exercises
 * grade via `testCases` / a plain `python` workspace, so neither marker is present.
 */
function isSqlExercise(exercise: PythonExercise | SqlExercise): exercise is SqlExercise {
  if ("singleFile" in exercise && exercise.singleFile) return true
  if (exercise.workspace?.language === "sql") return true
  return false
}

/**
 * Adapt a tutorial exercise OBJECT (Python or SQL) to the `Scenario` the client-side executor
 * understands, dispatching on the exercise's own fields. Returns undefined only for a SQL exercise that
 * carries neither a workspace nor single-file grading (an authoring error). Mirrors the branch order of
 * the id-based `getTutorialExerciseScenario`, minus the registry lookup.
 */
export function toTutorialExerciseScenario(
  exercise: PythonExercise | SqlExercise
): Scenario | undefined {
  if (isSqlExercise(exercise)) {
    if (exercise.executionMode === "workspace" && exercise.workspace) {
      return toSqlWorkspaceScenario(exercise, exercise.workspace)
    }
    if (exercise.singleFile) {
      return toSqlSingleFileScenario(exercise, exercise.singleFile)
    }
    return undefined
  }
  if (exercise.executionMode === "workspace" && exercise.workspace) {
    return toWorkspaceScenario(exercise, exercise.workspace)
  }
  return toSingleFileScenario(exercise)
}
