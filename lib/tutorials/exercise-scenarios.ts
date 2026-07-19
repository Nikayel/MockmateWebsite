/**
 * Id-based bridge from an authored tutorial exercise (Python OR SQL) to the client-side executor
 * `Scenario`. This is the ONLY tutorial module here that imports the Python + SQL curriculum
 * registries, so it is deliberately kept OFF the client run path: `useExerciseRun` builds its Scenario
 * straight from the exercise prop it already holds via the registry-free
 * `./exercise-scenario-adapters`, so neither full curriculum ships to the browser.
 *
 * The Lesson Player runs entirely in the browser via `executeScenarioInBrowser`
 * (`lib/workspace-execution/browser-execution.ts`) — Piston / `POST /api/execute` is no longer used
 * (see the Piston-deprecation note). The pure exercise→Scenario adapters live in
 * `./exercise-scenario-adapters`; this module only resolves an id to an exercise and delegates.
 */
import type { Scenario } from "@/lib/scenarios"
import { getExerciseById } from "./registry"
import { getSqlExerciseById } from "./sql/registry"
import { toTutorialExerciseScenario } from "./exercise-scenario-adapters"

/** Adapt a tutorial exercise (by id) to the `Scenario` the client-side executor understands. */
export function getTutorialExerciseScenario(exerciseId: string): Scenario | undefined {
  const exercise = getExerciseById(exerciseId) ?? getSqlExerciseById(exerciseId)
  return exercise ? toTutorialExerciseScenario(exercise) : undefined
}
