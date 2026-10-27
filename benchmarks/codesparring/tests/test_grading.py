import unittest

from benchmarks.codesparring.assessment import assess
from benchmarks.codesparring.contracts import Case, Execution
from benchmarks.codesparring.dsa.cases import parse_example
from benchmarks.codesparring.dsa.validation import agrees, strict_equal


class GradingTests(unittest.TestCase):
    def test_two_sum_accepts_both_orders(self):
        case = Case("pair", {"nums": [3, 3], "target": 6}, [0, 1], "private", "boundary")
        self.assertTrue(agrees("dsa-two-sum", case, [1, 0]))
        for invalid in ([0, 0], [True, 0], [3, 3], [0], [-1, 0], [0, 2], None):
            with self.subTest(invalid=invalid):
                self.assertFalse(agrees("dsa-two-sum", case, invalid))

    def test_subsets_preserves_multiplicity_but_allows_order(self):
        case = Case("subsets", {"nums": [1, 2]}, [[], [1], [2], [1, 2]], "private", "boundary")
        self.assertTrue(agrees("dsa-subsets", case, [[2, 1], [2], [], [1]]))
        for invalid in ([[], [1], [2], [1, 2], []], [[True], [2], [], [1, 2]],
                        [[], [1], [2], [1, 1, 2]], [[], [1], [2]], None):
            with self.subTest(invalid=invalid):
                self.assertFalse(agrees("dsa-subsets", case, invalid))

    def test_boolean_and_numeric_answers_are_not_interchangeable(self):
        self.assertFalse(strict_equal(True, 1))
        self.assertFalse(strict_equal(1.0, 1))
        self.assertFalse(strict_equal([False], [0]))
        self.assertTrue(strict_equal([[0, 1]], [[0, 1]]))

    def test_incomplete_worker_results_cannot_pass(self):
        case = Case("one", {"s": "()"}, True, "public", "shipped")
        task = {"id": "dsa-valid-parentheses", "track": "dsa"}
        result = assess(task, [case], Execution("complete", ()))
        self.assertEqual(result.passed, (False,))

    def test_example_parser_handles_commas_in_lists_and_strings(self):
        self.assertEqual(parse_example('nums = [1, 2], target = 3'), {"nums": [1, 2], "target": 3})
        self.assertEqual(parse_example('s = "a,b"'), {"s": "a,b"})
        with self.assertRaises(ValueError):
            parse_example('nums = __import__("os").getcwd()')


if __name__ == "__main__":
    unittest.main()
