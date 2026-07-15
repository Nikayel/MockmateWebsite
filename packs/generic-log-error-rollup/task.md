# Reliability rollup — nightly ERROR count per service

## Who reads this
The on-call engineer reads this rollup every morning. It counts, for each service,
how many ERROR lines that service logged overnight, so they know which services to
follow up on. This morning one service's total reads higher than the metering
dashboard shows, and the rollup is not trusted until the two agree.

## The program
`report.py` reads an application log feed and prints the ERROR-line count for each
service, in the order each service first appears in the feed.

Each log line has the layout `timestamp service level message`, separated by
whitespace. The feed is delivered at-least-once, so a line may arrive more than
once, and a single service's lines are not always contiguous.

## Data contract (all of this is intended; the correct output tolerates it)
- Lines starting with `#` are comments and are ignored.
- Fields are whitespace-separated: `timestamp service level message`.
- Levels are compared case-insensitively; `error`, `Error`, and `ERROR` are the
  same level. Only ERROR lines are counted; INFO and WARN lines are not.
- A line with fewer than four fields is truncated/malformed and is skipped.
- The same line may be delivered more than once (at-least-once feed); the report
  counts ERROR lines as they arrive and does not deduplicate.
- A service may appear, then reappear later after other services; all of its lines
  belong to that one service.

## Run it
```
python3 src/report.py fixtures/input.txt
```

## Expected output
```
=== ERROR lines by service ===
gateway: 0
catalog: 0
payments: 3
notifications: 2
```

The solution file is off-limits.
