# Session rollup — click sessions per user

## Who reads this
The Growth analyst reads this rollup every morning. It groups each user's raw
click events into sessions and prints, per user, how many sessions they had
overnight, so Growth can see who is genuinely returning versus who clicked once.
This morning one user reads as more sessions than the product analytics
dashboard shows for the same period, so Growth stopped trusting the rollup until
the two agree.

## The program
`session_rollup.py` reads the collector's event feed and prints, per user, the
number of inactivity-gap sessions that user had.

A session groups a user's consecutive clicks. Two consecutive events by the same
user belong to the SAME session when the gap between them is at most
`GAP_SECONDS` (1800 seconds); a gap LARGER than `GAP_SECONDS` starts a new
session. An event that lands exactly `GAP_SECONDS` after the previous one is
still within the window and belongs to the same session.

Within a user, events are considered in timestamp order. The feed may deliver a
user's events out of order, so they are sorted by timestamp before sessions are
counted.

## Data contract (all of this is intended; the correct output tolerates it)
- Columns are `timestamp,user_id,event_id,platform`.
- `timestamp` is ISO-8601 UTC, fixed width, always ending in `Z`
  (`2026-03-02T09:00:00Z`). Lexical order of these strings is the same as
  chronological order.
- Lines starting with `#` are comments and are ignored.
- The bus is at-least-once, so the same event (identified by `event_id`) can
  arrive more than once. Repeats of an `event_id` are the same event, counted
  once. An `event_id` identifies exactly one event.
- A user's events can arrive out of order, and a user may appear, disappear, and
  reappear later in the feed; all of a user's events belong to that one user.
- A line that is truncated (not exactly four columns), or has an unparseable
  timestamp, is malformed and is skipped.
- A user with a single event has exactly one session.
- Users are printed in sorted order.

## Run it
```
python3 src/session_rollup.py fixtures/input.txt
```

## Expected output
```
=== sessions per user (gap 1800s) ===
alice: 2
bob: 1
carol: 1
dan: 2
```

`tests/expected_output.txt` is the oracle. Do not edit it to make the run pass.
