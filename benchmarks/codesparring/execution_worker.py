"""Execute only developer-authored programs; no grading answers enter this process."""
from __future__ import annotations

import contextlib
import copy
import io
import json
import resource
import sys
from pathlib import Path


class BoundedOutput(io.StringIO):
    def write(self, value: str) -> int:
        if self.tell() + len(value) > 65_536:
            raise ValueError("Program output exceeded 64 KiB")
        return super().write(value)


def main() -> None:
    resource.setrlimit(resource.RLIMIT_CPU, (3, 4))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    resource.setrlimit(resource.RLIMIT_FSIZE, (1_048_576, 1_048_576))
    # Darwin rejects the address-space/data limits used here. Do not claim memory
    # isolation on macOS. This runner is only for trusted, authored fixtures.
    if sys.platform == "linux":
        resource.setrlimit(resource.RLIMIT_AS, (536_870_912, 536_870_912))
    payload = json.load(sys.stdin)
    source = compile(payload["source"], "learner.py", "exec")
    results = []
    for inputs in payload["inputs"]:
        output = BoundedOutput()
        namespace = {"__name__": "__main__" if payload["track"] == "bugfix" else "learner"}
        try:
            with contextlib.redirect_stdout(output), contextlib.redirect_stderr(BoundedOutput()):
                if payload["track"] == "bugfix":
                    Path("input.txt").write_text(inputs["fixture"], encoding="utf8")
                    sys.argv = ["learner.py", "input.txt"]
                try:
                    exec(source, namespace)
                except SystemExit as exit_signal:
                    if payload["track"] != "bugfix" or exit_signal.code not in (None, 0):
                        raise
                if payload["track"] == "dsa":
                    value = namespace[payload["entry"]](**copy.deepcopy(inputs))
                else:
                    value = output.getvalue()
            json.dumps(value, allow_nan=False)
            results.append({"value": value, "error": None})
        except BaseException as error:
            results.append({"value": None, "error": f"{type(error).__name__}: {error}"[:1000]})
    print(json.dumps(results, allow_nan=False))


if __name__ == "__main__":
    main()
