import unittest

from benchmarks.codesparring.bugfix.payment_oracles import webhook
from benchmarks.codesparring.bugfix.state_oracles import cache, pipelines
from benchmarks.codesparring.bugfix.time_oracles import monitors, sessions, windows
from benchmarks.codesparring.dsa.domain import valid_inputs


class OracleTests(unittest.TestCase):
    def test_half_open_metric_window_and_inclusive_session_gap(self):
        feed = "2026-05-01T12:00:00Z,web.5xx,a,2\n2026-05-01T12:01:00Z,web.5xx,b,3\n"
        self.assertEqual(windows(feed), "=== web.5xx per 60s window ===\n12:00:00  count=1  sum=2\n12:01:00  count=1  sum=3\n")
        clicks = "2026-05-01T12:00:00Z,u,a,web\n2026-05-01T12:30:00Z,u,b,web\n2026-05-01T13:00:01Z,u,c,web\n"
        self.assertEqual(sessions(clicks), "=== sessions per user (gap 1800s) ===\nu: 2\n")

    def test_monitor_zero_is_observed_data_and_threshold_equality_alerts(self):
        feed = "monitor,x,0,0\nmonitor,y,1,0\nsample,x,a,2026-05-01T12:00:00Z,0\n"
        self.assertEqual(monitors(feed), "=== Monitor status ===\nx: ALERT\ny: NO DATA\n")

    def test_last_write_wins_and_expiry_equality(self):
        self.assertEqual(cache("x,a,1699999999\nx,a,1700000001\nx,b,1700000000\n"),
                         "=== Live entries by namespace ===\nx: 1\n")

    def test_webhook_identity_and_refund_sign(self):
        feed = "a,charge,x,10,t\na,charge,x,10,t\nb,charge,x,10,t\nc,refund,x,4,t\n"
        self.assertEqual(webhook(feed), "=== Net balance (cents) by merchant ===\nx: 16\n")

    def test_pipeline_counters_do_not_depend_on_commit_batches(self):
        feed = "normalize,a,1,t\nenrich,b,1,t\nenrich,b,1,t\npublish,c,0,t\n"
        self.assertEqual(pipelines(feed), "=== Records materialized by pipeline ===\nnormalize: materialized=1\nenrich: materialized=1\ngeocode: materialized=0\npublish: materialized=0\n")

    def test_domain_guards_reject_invalid_benchmark_inputs(self):
        self.assertFalse(valid_inputs("dsa-two-sum", {"nums": [1, 2, 3, 4], "target": 5}))
        self.assertFalse(valid_inputs("dsa-house-robber", {"nums": []}))
        self.assertFalse(valid_inputs("dsa-subsets", {"nums": [1, 1]}))
        self.assertFalse(valid_inputs("dsa-valid-palindrome", {"s": "é"}))
        self.assertFalse(valid_inputs("dsa-binary-search", {"nums": [2, 1], "target": 1}))
        self.assertTrue(valid_inputs("dsa-two-sum", {"nums": [3, 3], "target": 6}))


if __name__ == "__main__":
    unittest.main()
