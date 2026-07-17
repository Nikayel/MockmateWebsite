/**
 * The worker reuses ONE Pyodide interpreter for a whole page load. `sys.modules` is keyed
 * by module NAME, not by path, so giving each run its own directory does not give it a
 * fresh import: run 2's `import solution` finds run 1's entry and returns it. Only the
 * first Run in a page load reflected the learner's code; every later one silently
 * re-graded the first, and reloading was the only escape.
 *
 * This extracts the purge Python from the SHIPPED worker file and runs the real scenario
 * through a real interpreter, rather than restating the logic — a copy of the fix would
 * pass while the worker stayed broken.
 */
import { describe, expect, it } from "vitest"
import { execFileSync } from "child_process"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { readFileSync } from "fs"

const WORKER = readFileSync(join(process.cwd(), "public/workers/python-sandbox-worker.js"), "utf8")

/** Where the worker puts each run's files, per its own constant. */
const WORKSPACE_PREFIX = WORKER.match(/const WORKSPACE_ROOT_PREFIX = "([^"]+)"/)![1]

/**
 * The Python inside purgeWorkspaceModules' runPythonAsync template literal.
 *
 * `prefix` substitutes for the worker's own `/home/pyodide/workspace_`, which cannot be
 * created on a test machine. Only the matched PATH changes; the purge logic under test is
 * the shipped source, character for character.
 */
function extractPurgeSource(prefix: string = WORKSPACE_PREFIX): string {
  const match = WORKER.match(
    /async function purgeWorkspaceModules\(pyodide\) \{\s*await pyodide\.runPythonAsync\(`([\s\S]*?)`\)\s*\}/
  )
  if (!match) throw new Error("could not find purgeWorkspaceModules in the worker")
  return match[1].replace(/\$\{JSON\.stringify\(WORKSPACE_ROOT_PREFIX\)\}/g, JSON.stringify(prefix))
}

/**
 * Two runs in ONE interpreter, mirroring the worker: purge, fresh dir, chdir, exec the
 * entrypoint with fresh globals. Returns what the runner printed on each run.
 */
function runTwice(opts: { purge: boolean }): string[] {
  const base = mkdtempSync(join(tmpdir(), "wsprobe-"))
  try {
    // Stands in for the worker's `/home/pyodide/workspace_`, which we cannot mkdir here.
    // Runs live at `<root>0` and `<root>1`, exactly as `${PREFIX}${counter++}` does.
    const root = join(base, "workspace_")
    const dirs = [`${root}0`, `${root}1`]
    const answers = ["FIRST", "SECOND"]

    dirs.forEach((dir, i) => {
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, "solution.py"), `def answer():\n    return "${answers[i]}"\n`)
      writeFileSync(join(dir, "run_tests.py"), `import solution\nprint(solution.answer())\n`)
    })

    const purge = opts.purge ? extractPurgeSource(root) : "pass"
    const driver = `
import os, sys
sys.path.insert(0, "")
for _dir in ${JSON.stringify(dirs)}:
${purge
  .split("\n")
  .map((l) => "    " + l)
  .join("\n")}
    os.chdir(_dir)
    sys.path[0] = _dir
    exec(open("run_tests.py").read(), {})
`
    return execFileSync("python3", ["-c", driver], { encoding: "utf8", timeout: 20000 })
      .trim()
      .split("\n")
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
}

describe("worker module purge", () => {
  it("runs the learner's CURRENT code on a second run, not the first run's", () => {
    expect(runTwice({ purge: true })).toEqual(["FIRST", "SECOND"])
  })

  it("negative control: without the purge, run 2 re-executes run 1's code", () => {
    // This is the bug as it shipped. If this ever returns ["FIRST","SECOND"], the purge
    // has stopped being what makes the test above pass and this file is worthless.
    expect(runTwice({ purge: false })).toEqual(["FIRST", "FIRST"])
  })

  it("leaves modules that did not come from a workspace alone", () => {
    // Purging by workspace path (not by diffing a boot snapshot) keeps stdlib and any
    // micropip package warm across runs.
    const script = `
import json, sys
${extractPurgeSource()}
print("json" in sys.modules)
`
    expect(execFileSync("python3", ["-c", script], { encoding: "utf8" }).trim()).toBe("True")
  })

  it("is actually wired into the workspace branch of the worker", () => {
    // The purge existing but never being called is the failure mode with no symptom.
    expect(WORKER).toMatch(/await purgeWorkspaceModules\(pyodide\)/)
    const callIndex = WORKER.indexOf("await purgeWorkspaceModules(pyodide)")
    const mkdirIndex = WORKER.indexOf("pyodide.FS.mkdir(workspaceRoot)")
    expect(callIndex).toBeGreaterThan(-1)
    expect(callIndex).toBeLessThan(mkdirIndex)
  })
})
