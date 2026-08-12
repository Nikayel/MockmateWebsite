/**
 * Correctness guard for every WORKSPACE Python lesson — the multi-file half of the course, which
 * until now had no guard at all.
 *
 * `python-reference-solutions.test.ts` proves single-file `referenceSolution`s pass their own
 * `testCases`. Workspace exercises are graded by running an embedded Python test runner over a
 * materialized file tree, so nothing there was ever executed in CI: an exercise could ship with a
 * reference that does not compile, a hidden test that contradicts the visible ones, or a starter
 * that already passes, and every test in the repo would stay green.
 *
 * Three properties are asserted per exercise, each of which has a distinct failure mode in front of
 * a learner:
 *
 *  1. **The reference passes.** Overlay `referenceFiles` onto `files` and every recorded test must
 *     pass. A failing reference means the model answer the lesson reveals is wrong.
 *  2. **The starter fails.** Run the same tree with the authored starter. At least one test must
 *     fail, otherwise the exercise is pre-solved and "Run tests" is green before the learner types.
 *  3. **The tree is well-formed.** Declared paths resolve, every package dir has an `__init__.py`,
 *     hidden suites are labelled so the runner's `"hidden" in suite.lower()` derivation holds.
 *
 * Runs against a real `python3` in a temp dir, mirroring how the single-file suite runs `python3`
 * rather than booting Pyodide per case.
 */
import { describe, expect, it, beforeAll } from "vitest"
import { execFileSync } from "child_process"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs"
import { tmpdir } from "os"
import { dirname, join } from "path"
import { PYTHON_LEVELS } from "@/lib/tutorials/curriculum"
import type { PythonExercise } from "@/lib/tutorials/types"
import type { WorkspaceScenarioFile } from "@/lib/scenarios/types"

interface WorkspaceCase {
  lessonId: string
  slot: string
  exercise: PythonExercise
}

const cases: WorkspaceCase[] = []
for (const level of PYTHON_LEVELS) {
  for (const mod of level.modules) {
    for (const lesson of mod.lessons) {
      const slots: Array<[string, PythonExercise]> = [
        ["apply", lesson.apply],
        ["practice", lesson.practice],
        ...(lesson.extraPractice ?? []).map(
          (exercise, index) => [`extra-practice[${index}]`, exercise] as [string, PythonExercise]
        ),
      ]
      for (const [slot, exercise] of slots) {
        if (exercise?.executionMode === "workspace" && exercise.workspace) {
          cases.push({ lessonId: lesson.id, slot, exercise })
        }
      }
    }
  }
}

interface RecordedTest {
  suite: string
  name: string
  passed: boolean
  error: string | null
  isHidden: boolean
}

const RESULTS_MARKER = "__WORKSPACE_TEST_RESULTS__:"

/**
 * Materialize the file tree and run its test runner, exactly as the Pyodide workspace runner does.
 * `overlay` replaces same-path files (this is how `referenceFiles` is applied at runtime).
 */
function runWorkspace(
  exercise: PythonExercise,
  overlay: WorkspaceScenarioFile[] = []
): { results: RecordedTest[]; stderr: string } {
  const workspace = exercise.workspace!
  const root = mkdtempSync(join(tmpdir(), "py-ws-"))
  try {
    const byPath = new Map<string, WorkspaceScenarioFile>()
    for (const file of workspace.files) byPath.set(file.path, file)
    for (const file of overlay) byPath.set(file.path, file)

    for (const file of byPath.values()) {
      const full = join(root, file.path)
      mkdirSync(dirname(full), { recursive: true })
      writeFileSync(full, file.content)
    }

    const stdout = execFileSync("python3", [workspace.testRunnerPath!], {
      cwd: root,
      encoding: "utf8",
      timeout: 60000,
    })
    const line = stdout.split("\n").find((l) => l.startsWith(RESULTS_MARKER))
    if (!line) throw new Error(`runner printed no results marker. stdout:\n${stdout}`)
    return { results: JSON.parse(line.slice(RESULTS_MARKER.length)), stderr: "" }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

describe("Python workspace exercises", () => {
  beforeAll(() => {
    // Fail loudly rather than silently skipping every case if python3 is missing.
    execFileSync("python3", ["--version"])
  })

  it("collected workspace cases", () => {
    expect(cases.length).toBeGreaterThan(0)
  })

  for (const { lessonId, slot, exercise } of cases) {
    const workspace = exercise.workspace!

    it(`${lessonId} [${slot}] declares a well-formed tree`, () => {
      const paths = new Set(workspace.files.map((f) => f.path))
      const problems: string[] = []

      const declared = [
        workspace.primaryFilePath,
        ...workspace.editableFilePaths,
        ...workspace.visibleTestPaths,
        ...workspace.hiddenTestPaths,
        ...(workspace.testRunnerPath ? [workspace.testRunnerPath] : []),
      ]
      for (const path of declared) {
        if (!paths.has(path)) problems.push(`declared path ${path} is not in files[]`)
      }
      if (!workspace.testRunnerPath) problems.push("no testRunnerPath")

      // Editable files must not be marked read-only, or the learner cannot type in them.
      // `role: "test"` is legitimately editable: `py-l5-pin-the-seam` has the learner WRITE the
      // regression test, so the file they edit is the test file itself.
      for (const path of workspace.editableFilePaths) {
        const file = workspace.files.find((f) => f.path === path)
        if (file && file.role !== "editable" && file.role !== "test") {
          problems.push(`${path} is listed editable but has role "${file.role}"`)
        }
        if (file?.hidden) problems.push(`${path} is listed editable but is hidden`)
      }

      // Every Python package dir needs an __init__.py or the runner's imports fail.
      const pkgDirs = new Set<string>()
      for (const file of workspace.files) {
        if (!file.path.endsWith(".py")) continue
        const dir = dirname(file.path)
        if (dir !== ".") pkgDirs.add(dir)
      }
      for (const dir of pkgDirs) {
        if (!paths.has(`${dir}/__init__.py`)) problems.push(`${dir}/ has no __init__.py`)
      }

      // Hidden test files must never be visible in the editor.
      for (const path of workspace.hiddenTestPaths) {
        const file = workspace.files.find((f) => f.path === path)
        if (file && !file.hidden) problems.push(`hidden test ${path} is not marked hidden:true`)
      }

      expect(problems, problems.join("\n")).toEqual([])
    })

    it(`${lessonId} [${slot}] reference solution passes every test`, () => {
      expect(
        workspace.referenceFiles?.length,
        `${lessonId} [${slot}] has no referenceFiles, so its solvability is unverifiable`
      ).toBeGreaterThan(0)

      const { results } = runWorkspace(exercise, workspace.referenceFiles)
      expect(results.length, "runner recorded no tests").toBeGreaterThan(0)

      const failures = results
        .filter((r) => !r.passed)
        .map((r) => `${r.suite} / ${r.name}: ${r.error}`)
      expect(failures, failures.join("\n")).toEqual([])
    })

    it(`${lessonId} [${slot}] starter does not already pass`, () => {
      let results: RecordedTest[]
      try {
        results = runWorkspace(exercise).results
      } catch {
        // The starter raising (SyntaxError, NameError, unimplemented stub) is a legitimate
        // "not yet solved" state — the learner sees the traceback and fills in the TODO.
        return
      }
      const passed = results.filter((r) => r.passed).length
      expect(
        passed,
        `every one of the ${results.length} tests already passes with the authored starter, so the exercise is pre-solved`
      ).toBeLessThan(results.length)
    })
  }
})
