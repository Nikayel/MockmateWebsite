/**
 * Build a pytest-flavoured runner: it discovers `test_*` functions in each test module (like
 * pytest does) and records pass/fail, so lesson test files read as real pytest while still running
 * under the client Pyodide executor (which has no pytest installed).
 */
export function buildPytestRunner(
  visibleModule: string,
  hiddenModule: string,
  visibleSuite: string,
  hiddenSuite: string
): string {
  return String.raw`import inspect
import json
import os
import sys
import traceback

sys.path.insert(0, os.getcwd())
from tests import ${visibleModule}, ${hiddenModule}

results = []


def run_module(module, suite):
    is_hidden = "hidden" in suite.lower()
    for name, fn in inspect.getmembers(module, inspect.isfunction):
        if not name.startswith("test_") or getattr(fn, "__module__", None) != module.__name__:
            continue
        try:
            fn()
            results.append({"suite": suite, "name": name, "passed": True, "error": None, "isHidden": is_hidden})
        except AssertionError as exc:
            results.append({"suite": suite, "name": name, "passed": False, "error": str(exc) or (name + " failed"), "isHidden": is_hidden})
        except Exception as exc:
            results.append({"suite": suite, "name": name, "passed": False, "error": str(exc) or traceback.format_exc(), "isHidden": is_hidden})


run_module(${visibleModule}, "${visibleSuite}")
run_module(${hiddenModule}, "${hiddenSuite}")
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`
}
