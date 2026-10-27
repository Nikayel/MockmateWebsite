import unittest

from benchmarks.codesparring.assessment import assess
from benchmarks.codesparring.contracts import Case
from benchmarks.codesparring.execution import execute


class ExecutionTests(unittest.TestCase):
    def test_zero_exit_is_not_a_successful_output(self):
        cases = [Case("one", {"fixture": "data\n"}, "required\n", "public", "shipped")]
        result = execute("import sys\nsys.exit(0)\n", "", "bugfix", cases)
        graded = assess({"id": "test", "track": "bugfix"}, cases, result)
        self.assertEqual(graded.passed, (False,))

    def test_correct_cli_with_explicit_zero_exit_is_accepted(self):
        cases = [Case("one", {"fixture": "data\n"}, "required\n", "public", "shipped")]
        result = execute('import sys\nprint("required")\nsys.exit(0)\n', "", "bugfix", cases)
        self.assertEqual(assess({"id": "test", "track": "bugfix"}, cases, result).passed, (True,))

    def test_case_input_mutation_does_not_leak_between_calls(self):
        cases = [Case(str(i), {"nums": [3, 1]}, 2, "private", "boundary") for i in range(2)]
        source = "def f(nums):\n    result = len(nums)\n    nums.clear()\n    return result\n"
        result = execute(source, "f", "dsa", cases)
        self.assertEqual([row["value"] for row in result.results], [2, 2])
        self.assertEqual(cases[0].inputs["nums"], [3, 1])

    def test_globals_are_reset_for_each_case(self):
        source = "calls = 0\ndef f():\n    global calls\n    calls += 1\n    return calls\n"
        result = execute(source, "f", "dsa", [Case(str(i), {}, 1, "private", "boundary") for i in range(3)])
        self.assertEqual([row["value"] for row in result.results], [1, 1, 1])

    def test_timeout_is_a_failure(self):
        result = execute("while True:\n    pass\n", "f", "dsa",
                         [Case("one", {}, True, "private", "boundary")], timeout=0.15)
        self.assertEqual(result.status, "timeout")

    def test_output_flood_is_bounded(self):
        result = execute('print("x" * 100000)\n', "", "bugfix",
                         [Case("one", {"fixture": ""}, "expected", "private", "boundary")])
        self.assertEqual(result.status, "complete")
        self.assertIn("output exceeded", result.results[0]["error"])

    def test_printing_grading_protocol_cannot_forge_function_result(self):
        source = 'def f():\n    print(\'[{"value": true, "error": null}]\')\n    return False\n'
        result = execute(source, "f", "dsa", [Case("one", {}, True, "private", "boundary")])
        self.assertEqual(result.results[0]["value"], False)


if __name__ == "__main__":
    unittest.main()
