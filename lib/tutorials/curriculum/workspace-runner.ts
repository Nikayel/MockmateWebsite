/**
 * The one workspace test runner every Python workspace lesson embeds.
 *
 * This script is authored content, not engine code: it ships INSIDE each exercise as a
 * `role: "test", hidden: true` file and is executed by the Pyodide workspace runner
 * (`lib/workspace-execution/python-sandbox/workspace-runner.ts`), which reads the
 * `__WORKSPACE_TEST_RESULTS__:` line it prints.
 *
 * It used to be copy-pasted into six curriculum files with two different signatures (level3/level4
 * took a fixed visible/hidden pair; the level5 modules took a suite list). The suite-list shape is
 * strictly more general, so that is the one that survived: a lesson with several visible suites, or
 * several hidden ones, needs no new runner.
 *
 * Load-bearing contract, mirrored by the sandbox:
 *  - `isHidden` is derived from `"hidden" in suite.lower()`, so a hidden suite's `label` MUST
 *    contain the word "hidden" and its file MUST be listed in `hiddenTestPaths`.
 *  - Every test module lives in the `tests` package and exposes `run_tests(record)`.
 */

export interface RunnerSuite {
  /** Module name inside the `tests` package, e.g. `"test_checkout_hidden"` (no `.py`). */
  module: string
  /** Human-readable suite label. Must contain "hidden" for hidden suites. */
  label: string
}

export function buildRunner(suites: RunnerSuite[]): string {
  const imports = suites.map((suite) => suite.module).join(", ")
  const invocations = suites
    .map((suite) => `${suite.module}.run_tests(record_factory("${suite.label}"))`)
    .join("\n")

  return String.raw`import json
import os
import sys
import traceback

sys.path.insert(0, os.getcwd())
from tests import ${imports}

results = []


def record_factory(suite):
    def record(name, fn):
        is_hidden = "hidden" in suite.lower()
        try:
            fn()
            results.append({"suite": suite, "name": name, "passed": True, "error": None, "isHidden": is_hidden})
        except AssertionError as exc:
            results.append({"suite": suite, "name": name, "passed": False, "error": str(exc) or (name + " failed"), "isHidden": is_hidden})
        except Exception as exc:
            results.append({"suite": suite, "name": name, "passed": False, "error": str(exc) or traceback.format_exc(), "isHidden": is_hidden})

    return record


${invocations}
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`
}

/** Every Python package dir needs one; named so the intent reads at the call site. */
export const EMPTY_INIT = ""
