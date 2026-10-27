"""Exact authored repairs plus plausible partial fixes and regressions."""
from ..contracts import Json, Program, replace_once

# Data definitions, not an automatic interpretation of sealed solution prose.
EDITS = {
    "stripe-webhook-idempotency": {
        "fix": ('key = (event["merchant"], event["type"], event["amount"])', 'key = event["event_id"]'),
        "partial": ('key = event["event_id"]', 'key = event["merchant"]'),
        "regression": ('balances.get(merchant, 0) - event["amount"]', 'balances.get(merchant, 0) + event["amount"]'),
    },
    "palantir-entity-resolution-merge": {
        "fix": ('    return name\n', '    return (namespace, name)\n'),
        "partial": ('    return (namespace, name)\n', '    return namespace\n'),
        "regression": ('return raw.strip().lower()', 'return raw.strip()'),
    },
    "datadog-metric-window-rollup": {
        "fix": ('start <= s["epoch"] <= end', 'start <= s["epoch"] < end'),
        "partial": ('start <= s["epoch"] < end', 'start < s["epoch"] < end'),
        "regression": ('ordered = dedupe(samples)', 'ordered = list(samples)'),
    },
    "generic-session-window-count": {
        "fix": ('event["epoch"] - previous_epoch >= GAP_SECONDS', 'event["epoch"] - previous_epoch > GAP_SECONDS'),
        "partial": ('event["epoch"] - previous_epoch > GAP_SECONDS', 'event["epoch"] - previous_epoch > GAP_SECONDS + 1'),
        "regression": ('previous_epoch = event["epoch"]', 'previous_epoch = ordered[0]["epoch"]'),
    },
    "generic-log-error-rollup": {
        "fix": ('    error_count = 0\n    for service in grouped:\n', '    for service in grouped:\n        error_count = 0\n'),
        "partial": ('if level == ERROR_LEVEL:', 'if level != ERROR_LEVEL:'),
        "regression": ('for service in report:\n', 'for service in sorted(report):\n'),
    },
    "datadog-monitor-empty-series": {
        "fix": ('    average = sum(values) / len(values) if values else 0', '    if not values:\n        return "NO DATA"\n    average = sum(values) / len(values)'),
        "partial": ('    if not values:', '    if not values or sum(values) == 0:'),
        "regression": ('average >= monitor["crit"]', 'average > monitor["crit"]'),
    },
    "generic-cache-eviction-mutation": {
        "fix": ('            entries.pop(index)\n        index += 1', '            entries.pop(index)\n        else:\n            index += 1'),
        "partial": ('entry["expires_at"] <= now', 'entry["expires_at"] < now'),
        "regression": ('cache[namespace][event["key"]] = event', 'cache[namespace].setdefault(event["key"], event)'),
    },
    "stripe-payout-batch-mutation": {
        "fix": ('            pending.remove(payout)\n', ''),
        "partial": ('if payout["id"] in seen:', 'if payout["merchant"] in seen:'),
        "regression": ('SUPPORTED_CURRENCIES = ("usd", "eur", "gbp")', 'SUPPORTED_CURRENCIES = ("usd",)'),
    },
    "palantir-pipeline-order-dependence": {
        "fix": ('        counts[pipeline] = materialized', '        counts[pipeline] = materialized\n        batch = []'),
        "partial": ('if not is_valid(record):', 'if False:'),
        "regression": ('records = dedupe(parse_feed(sys.argv[1]))', 'records = parse_feed(sys.argv[1])'),
    },
    "palantir-foundry-usage-rollup": {
        "fix": ('for event in primary + backup:', 'for event in dedupe(primary + backup):'),
        "partial": ('for event in dedupe(primary + backup):', 'for event in primary:'),
        "regression": ('"account_id": account_id.lower()', '"account_id": account_id'),
    },
}


def build_program(task: dict[str, Json]) -> Program:
    edits = EDITS[task["id"]]
    reference = replace_once(task["starter"], *edits["fix"])
    partial = replace_once(reference, *edits["partial"])
    if task["id"] == "stripe-payout-batch-mutation":
        partial = replace_once(partial, 'seen.add(payout["id"])', 'seen.add(payout["merchant"])')
    return Program("", reference, {
        "shipped-defect": task["starter"],
        "partial-fix": partial,
        "regression-after-fix": replace_once(reference, *edits["regression"]),
        "hardcode-public-output": f'import sys\nsys.stdout.write({task["expectedStdout"]!r})\n',
    })
