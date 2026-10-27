import json
import unittest

from benchmarks.codesparring.model_inputs import private_label, requests_for


class ModelInputTests(unittest.TestCase):
    def setUp(self):
        self.task = {"id": "test", "statement": "Public problem", "constraints": ["Public bound"],
                     "minimalFix": "private-solution-sentinel", "group": "private-taxonomy-sentinel"}
        self.state = {"task_id": "test", "state_id": "state-00", "code": "visible_code()",
                      "observations": [], "private_kind": "private-label-sentinel", "private_correct": False}

    def test_only_public_allowlist_enters_messages(self):
        requests = requests_for(self.task, self.state, "Public policy", "0.1.0", "test-digest")
        self.assertEqual([row["level"] for row in requests], [1, 2, 3])
        encoded = json.dumps(requests)
        self.assertNotIn("private-solution-sentinel", encoded)
        self.assertNotIn("private-taxonomy-sentinel", encoded)
        self.assertNotIn("private-label-sentinel", encoded)
        for row in requests:
            context = json.loads(row["messages"][1]["content"].split("\n\n", 1)[1])
            self.assertEqual(set(context), {"problem", "constraints", "language", "current_code",
                                            "visible_test_evidence", "previous_hints"})

    def test_unexpected_state_field_requires_explicit_review(self):
        with self.assertRaises(ValueError):
            requests_for(self.task, {**self.state, "hidden_tests": []}, "Public policy", "0.1.0", "test-digest")

    def test_qa_labels_are_not_fabricated_hint_ratings(self):
        label = private_label(self.state)
        self.assertIsNone(label["hint_labels"])
        self.assertFalse(label["program_correct_on_suite"])


if __name__ == "__main__":
    unittest.main()
