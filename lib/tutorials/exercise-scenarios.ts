/**
 * Bridges authored tutorial exercises to the existing **client-side** executor.
 *
 * The Lesson Player runs Python entirely in the browser via `executeScenarioInBrowser`
 * (`lib/workspace-execution/browser-execution.ts`) — Piston / `POST /api/execute` is no longer
 * used (see the Piston-deprecation note). That executor consumes a `Scenario`, so we adapt a
 * `PythonExercise` into one here.
 *
 * Only a SUBSET of `Scenario` is read at runtime:
 *  - single-file → `{ id, type: "dsa", testCases }` (the executor reads `testCases`; `type: "dsa"`
 *    keeps `buildFullCode` a no-op so the learner's code runs verbatim).
 *  - workspace → `{ id, executionMode: "workspace", workspace }` (the executor's `isWorkspaceScenario`
 *    only checks `executionMode === "workspace"` and `Boolean(workspace)`).
 *
 * Because the rest of a real `DSAScenario` / `AddFunctionalityScenario` (pattern, complexity,
 * examples, …) is meaningless for a tutorial, we synthesize an execution-only object and assert
 * it with a single documented `as unknown as Scenario` cast rather than inventing fake fields.
 */
import type { Scenario } from "@/lib/scenarios"
import { getExerciseById } from "./registry"
import type { PythonExercise } from "./types"

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

/** Adapt a tutorial exercise (by id) to the `Scenario` the client-side executor understands. */
export function getTutorialExerciseScenario(exerciseId: string): Scenario | undefined {
  const exercise = getExerciseById(exerciseId)
  if (!exercise) return undefined

  if (exercise.executionMode === "workspace" && exercise.workspace) {
    return toWorkspaceScenario(exercise, exercise.workspace)
  }
  return toSingleFileScenario(exercise)
}
