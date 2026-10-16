"""Read-only regression checks for the cache replay job.

Runs the normal incident report first, then independent public replay cases.
All checks use the same application modules as the command-line job.
"""

import json
import sys
import tempfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from cache_sweep import NOW, main
from cache_store import CacheStore
from log_reader import read_events


def check_case(case):
    """Check retained state as well as repeatability of cleanup."""
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "writes.txt"
        path.write_text(case["input"], encoding="utf-8")
        cache = CacheStore()
        for event in read_events(path):
            cache.write(event)
        cache.sweep(NOW)
        first = cache.counts()
        cache.sweep(NOW)
        second = cache.counts()
    return first == case["counts"] and second == case["counts"]


def run_checks():
    main()
    cases_path = PROJECT_ROOT / "fixtures" / "regression_cases.json"
    with open(cases_path, encoding="utf-8") as handle:
        cases = json.load(handle)
    print("=== Regression checks ===")
    passed = 0
    for case in cases:
        try:
            matches = check_case(case)
        except Exception as error:
            print(case["name"] + ": ERROR (" + type(error).__name__ + ")")
            continue
        print(case["name"] + (": PASS" if matches else ": FAIL"))
        passed += int(matches)
    print("Regression checks: " + str(passed) + "/" + str(len(cases)) + " passed")


if __name__ == "__main__":
    run_checks()
