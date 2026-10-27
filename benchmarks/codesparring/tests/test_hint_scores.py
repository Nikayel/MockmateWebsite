import csv
import json
import tempfile
import unittest
from pathlib import Path

from benchmarks.codesparring.hint_scores import METRICS, score


class HintScoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.annotations = self.root / "reviews.csv"
        self.responses = self.root / "responses.jsonl"
        self.requests = [{"id": "q1", "task_id": "task1", "benchmark_version": "0.1.0", "recipe_sha256": "digest"},
                         {"id": "q2", "task_id": "task2", "benchmark_version": "0.1.0", "recipe_sha256": "digest"}]
        self.outputs = [{"id": f"r{i}", "request_id": f"q{i}", "model": "test-model",
                         "content": "A reviewed hint", "benchmark_version": "0.1.0", "recipe_sha256": "digest"}
                        for i in (1, 2)]
        self.write_outputs()

    def tearDown(self):
        self.temp.cleanup()

    def write_outputs(self):
        self.responses.write_text("".join(json.dumps(row) + "\n" for row in self.outputs))

    def write_reviews(self, rows):
        fields = ["request_id", "response_id", "reviewer", *METRICS, "notes"]
        with self.annotations.open("w", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)

    def review(self, i, value="1"):
        return {"request_id": f"q{i}", "response_id": f"r{i}", "reviewer": "reviewer",
                **{metric: value for metric in METRICS}, "notes": ""}

    def test_completed_scores_and_task_intervals(self):
        self.write_reviews([self.review(1), self.review(2, "0")])
        result = score(self.annotations, self.responses, self.requests)
        self.assertEqual(result["status"], "complete")
        self.assertEqual(result["task_count"], 2)
        self.assertEqual(result["scores"]["correct"]["macro_task_mean"], 0.5)
        self.assertEqual(result["scores"]["correct"]["task_cluster_95pct_interval"], [0.0, 1.0])

    def test_blank_template_is_unmeasured(self):
        self.write_reviews([{ "request_id": "q1" }])
        with self.assertRaisesRegex(ValueError, "No completed"):
            score(self.annotations, self.responses, self.requests)

    def test_partial_coverage_must_be_explicit(self):
        self.write_reviews([self.review(1)])
        with self.assertRaisesRegex(ValueError, "Incomplete"):
            score(self.annotations, self.responses, self.requests)
        result = score(self.annotations, self.responses, self.requests, allow_partial=True)
        self.assertEqual(result["status"], "partial")
        self.assertIsNone(result["scores"]["correct"]["task_cluster_95pct_interval"])

    def test_duplicate_reviews_cannot_inflate_weight(self):
        self.write_reviews([self.review(1), self.review(1), self.review(2)])
        with self.assertRaisesRegex(ValueError, "Duplicate review"):
            score(self.annotations, self.responses, self.requests)

    def test_response_benchmark_revision_must_match(self):
        self.outputs[0]["recipe_sha256"] = "old-revision"
        self.write_outputs()
        self.write_reviews([self.review(1), self.review(2)])
        with self.assertRaisesRegex(ValueError, "different benchmark"):
            score(self.annotations, self.responses, self.requests)

    def test_models_cannot_be_pooled(self):
        self.outputs[1]["model"] = "different-model"
        self.write_outputs()
        self.write_reviews([self.review(1), self.review(2)])
        with self.assertRaisesRegex(ValueError, "one model"):
            score(self.annotations, self.responses, self.requests)

    def test_missing_rating_cannot_be_silently_treated_as_zero(self):
        row = self.review(1)
        row["correct"] = ""
        self.write_reviews([row, self.review(2)])
        with self.assertRaisesRegex(ValueError, "0 or 1"):
            score(self.annotations, self.responses, self.requests)

    def test_extra_trials_do_not_overweight_one_request(self):
        self.requests[1]["task_id"] = "task1"
        self.requests.append({"id": "q3", "task_id": "task2", "benchmark_version": "0.1.0", "recipe_sha256": "digest"})
        self.outputs.append({**self.outputs[0], "id": "r1-extra"})
        self.outputs.append({**self.outputs[1], "id": "r3", "request_id": "q3"})
        self.write_outputs()
        duplicate_trial = {**self.review(1, "0"), "response_id": "r1-extra"}
        self.write_reviews([self.review(1, "0"), duplicate_trial, self.review(2), self.review(3)])
        result = score(self.annotations, self.responses, self.requests)
        self.assertEqual(result["scores"]["correct"]["macro_task_mean"], 0.75)


if __name__ == "__main__":
    unittest.main()
