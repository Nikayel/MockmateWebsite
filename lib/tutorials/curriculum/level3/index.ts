/**
 * Level 3 — Patterns (workspace). The syntax real codebases run on — dataclasses,
 * decorators, context managers, typing — drilled across real files.
 *
 * Agent 1 seeds ONE sample workspace lesson here as proof of the multi-file path
 * (see Slice D). Agent 2 authors the rest. Workspace authoring contract: a complete
 * `WorkspaceScenarioConfig` with >=1 visible + >=1 hidden test, a primary editable file,
 * and a Python `testRunnerPath` that prints `__WORKSPACE_TEST_RESULTS__:` JSON.
 */
import type { PythonLevel } from "../../types"

export const level3: PythonLevel = {
  id: 3,
  slug: "applied",
  title: "Level 3 — Patterns",
  tagline: "The production-shaped syntax — dataclasses, decorators, context managers, typing.",
  defaultExecutionMode: "workspace",
  estimatedHours: 6,
  modules: [],
}
