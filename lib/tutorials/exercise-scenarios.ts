/**
 * Bridges authored tutorial exercises (Python OR SQL) to the existing **client-side** executor.
 *
 * The Lesson Player runs entirely in the browser via `executeScenarioInBrowser`
 * (`lib/workspace-execution/browser-execution.ts`) — Piston / `POST /api/execute` is no longer used
 * (see the Piston-deprecation note). That executor consumes a `Scenario`, so we adapt a
 * `PythonExercise` / `SqlExercise` into one here.
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
import { getExerciseById } from "./registry"
import { getSqlExerciseById } from "./sql/registry"
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

/** Adapt a tutorial exercise (by id) to the `Scenario` the client-side executor understands. */
export function getTutorialExerciseScenario(exerciseId: string): Scenario | undefined {
  const pythonExercise = getExerciseById(exerciseId)
  if (pythonExercise) {
    if (pythonExercise.executionMode === "workspace" && pythonExercise.workspace) {
      return toWorkspaceScenario(pythonExercise, pythonExercise.workspace)
    }
    return toSingleFileScenario(pythonExercise)
  }

  const sqlExercise = getSqlExerciseById(exerciseId)
  if (sqlExercise) {
    if (sqlExercise.executionMode === "workspace" && sqlExercise.workspace) {
      return toSqlWorkspaceScenario(sqlExercise, sqlExercise.workspace)
    }
    if (sqlExercise.singleFile) {
      return toSqlSingleFileScenario(sqlExercise, sqlExercise.singleFile)
    }
  }

  return undefined
}
