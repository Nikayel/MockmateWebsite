// A local runner for this exercise, using only Python's standard library in CPython/Pyodide.
export const runner = `import importlib.util
import json
import os
import sys
import traceback

sys.path.insert(0, os.path.join(os.getcwd(), "src"))
results = []


def record(suite, name, fn):
    try:
        fn()
        results.append({"suite": suite, "name": name, "passed": True, "error": None, "isHidden": suite.startswith("hidden")})
    except BaseException:
        results.append({"suite": suite, "name": name, "passed": False, "error": traceback.format_exc(), "isHidden": suite.startswith("hidden")})


for suite, path in [
    ("visible error handling", "tests/test_rate_limiter.py"),
    ("hidden error handling", "tests/test_rate_limiter_hidden.py"),
]:
    # Catch interruption regressions in the harness; application code must propagate them.
    try:
        spec = importlib.util.spec_from_file_location(suite, path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        before = len(results)
        module.run_tests(lambda name, fn: record(suite, name, fn))
        if len(results) == before:
            raise RuntimeError("Suite reported no test results")
    except BaseException:
        results.append({"suite": suite, "name": "load or execute test suite", "passed": False, "error": traceback.format_exc(), "isHidden": suite.startswith("hidden")})

print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
`
