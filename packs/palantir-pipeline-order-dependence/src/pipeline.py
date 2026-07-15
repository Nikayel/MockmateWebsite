"""Materialize the daily record feed through the Foundry transform pipelines.

The nightly reconciliation job runs every named transform pipeline over the
shared record feed and reports, per pipeline, how many records that pipeline
successfully materialized. FinOps reads those per-pipeline counts to reconcile
transform usage against the platform dashboard before the numbers are billed.
See task.md for the column layout and the delivery contract the feed may violate.
"""

import sys

# The transform pipelines run over the shared feed in this fixed declared order.
PIPELINE_ORDER = ("normalize", "enrich", "geocode", "publish")

# Records are materialized in durable commit batches of this size; whatever is
# left in a partial batch is flushed when the pipeline finishes its records.
COMMIT_SIZE = 3


def parse_feed(path):
    """Read the feed into a list of record dicts.

    Blank lines and lines beginning with ``#`` are comments and are ignored. A
    line that does not split into exactly four columns is malformed and is
    skipped. No validation of the field values happens here.
    """
    records = []
    with open(path) as handle:
        for raw in handle:
            line = raw.rstrip("\n")
            if not line or line.startswith("#"):
                continue
            parts = line.split(",")
            if len(parts) != 4:
                continue
            pipeline, record_id, size, ts = (part.strip() for part in parts)
            records.append(
                {
                    "pipeline": pipeline,
                    "record_id": record_id,
                    "size": size,
                    "ts": ts,
                }
            )
    return records


def dedupe(records):
    """Drop at-least-once redeliveries from the feed.

    ``record_id`` is globally unique across the whole feed, so a record_id seen
    a second time is the same record redelivered by the bus and is kept once.
    """
    seen = set()
    unique = []
    for record in records:
        if record["record_id"] in seen:
            continue
        seen.add(record["record_id"])
        unique.append(record)
    return unique


def is_valid(record):
    """A record materializes only when its ``size`` is a positive integer; a
    non-numeric or non-positive size is a validation failure, not materialized.
    """
    try:
        return int(record["size"]) > 0
    except ValueError:
        return False


def records_for(records, pipeline):
    """Return one pipeline's records, ordered oldest first by timestamp."""
    subset = [record for record in records if record["pipeline"] == pipeline]
    subset.sort(key=lambda record: record["ts"])
    return subset


def run_pipelines(records):
    """Materialize each pipeline in declared order and return its record count.

    Valid records accumulate into a commit batch; the batch commits once it
    reaches ``COMMIT_SIZE`` and the trailing partial batch is flushed when the
    pipeline runs out of records.
    """
    counts = {}
    batch = []
    for pipeline in PIPELINE_ORDER:
        materialized = 0
        for record in records_for(records, pipeline):
            if not is_valid(record):
                continue
            batch.append(record)
            if len(batch) == COMMIT_SIZE:
                materialized += len(batch)
                batch = []
        materialized += len(batch)
        counts[pipeline] = materialized
    return counts


def print_report(counts):
    """Print the per-pipeline materialized counts in declared order."""
    print("=== Records materialized by pipeline ===")
    for pipeline in PIPELINE_ORDER:
        print(pipeline + ": materialized=" + str(counts[pipeline]))


def main():
    records = dedupe(parse_feed(sys.argv[1]))
    counts = run_pipelines(records)
    print_report(counts)


if __name__ == "__main__":
    main()
