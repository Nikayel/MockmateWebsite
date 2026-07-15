# SEALED — solution for generic-session-window-count

Never candidate-visible. Compiles into `lib/scenarios/sealed/generic-session-window-count.server.ts`.

## Bug (src/session_rollup.py, in `count_sessions()`)
The new-session test is `event["epoch"] - previous_epoch >= GAP_SECONDS`, which
opens a new session as soon as the gap REACHES the window. The contract says two
events belong to the same session when the gap is at most `GAP_SECONDS`; a new
session should begin only when the gap is strictly LARGER than the window. So a
gap of exactly `GAP_SECONDS` (1800s) is treated as a new session when it should
stay in the current one, splitting one session into two.

## Minimal fix
Make the comparison strict so a gap equal to the window stays in the same session:

```python
        elif event["epoch"] - previous_epoch > GAP_SECONDS:
```

## Why the symptom presents as it does
Only one user has two consecutive events exactly one window apart: `bob`, whose
`08:00:00` and `08:30:00` clicks are 1800 seconds apart. Correctly those two plus
`08:50:00` are one session; the boundary comparison splits `08:00:00` off into its
own session, so `bob` reads 2 sessions instead of 1. Every other user's gaps are
either well under 1800s (same session) or well over it (a genuine new session),
so their counts are already correct — partial wrongness, and the one inflated row
is the only user with an exact-boundary gap. `alice`'s 70-minute gap and `dan`'s
110-minute gap are true session breaks that both versions agree on; `carol` has a
single event and is one session in both.

## Red herrings (both reachable, both provably innocent)
1. `sorted(user_events, key=lambda event: event["ts_text"])` in `count_sessions()`
   — sorts by the raw ISO-8601 string rather than the parsed epoch, and that order
   drives every gap in the session count. Looks like a lexical string sort could
   misorder timestamps and fabricate or hide a gap. Provably innocent: the contract
   fixes the timestamps as fixed-width UTC with a constant `Z` offset, so lexical
   order equals chronological order. Reachable because the fixture delivers `alice`,
   `bob`, and `dan` out of order, so the sort actually reorders their rows before the
   gaps are measured.
2. `dedupe()` keying only on `event_id` — looks under-specified (why is one field
   enough to identify an event, and could it drop a legitimate repeat?). Provably
   innocent: the contract says the bus is at-least-once and an `event_id` identifies
   exactly one event, so the repeated `ed2` line is a genuine redelivery with
   identical fields; dropping it is correct. Reachable because the fixture contains
   that redelivery. It is also count-neutral here: a duplicate lands at the same
   timestamp, inside the same session, so keeping it would not change any count —
   another reason it cannot be the cause of an inflated total.

## Complexity
Parsing and dedup are O(n). Grouping is O(n). Sorting each user's events is
O(m log m) per user, O(n log n) overall. The session scan is one linear pass per
user, O(n) total. So time is O(n log n), dominated by the per-user sort; space is
O(n) for the retained events. Output order is an explicit `sorted()` over the keys,
never set or hash iteration.

## Phase-2 adaptation path
Ops wants sessions split by platform. The `platform` column is ALREADY parsed into
every event dict by `parse_line` and is thrown away today — `group_by_user` keys on
`user_id` alone. Adapt, don't rewrite: key the grouping on `(user_id, platform)`,
carry that key through `build_counts`, and change the print to `user/platform:`
sorted by the key. The fix must ship first: the split is orthogonal to the boundary
comparison, and `bob` still needs the strict comparison to read 1 web session. The
phase-2 fixture only adds `mobile` rows for `alice` at times that fall inside her
existing web sessions, so unadapted code (which ignores platform) merges them in and
prints the v1 report unchanged — the silent platform blindness is exactly the ops
complaint.

## Debrief
Deliver the intended boundary-comparison flaw vs the candidate's actual path, what
they did well, where signal was lost, and exactly ONE drill (at-most-vs-strictly
boundary reasoning if the SCOPE pass was weak; adapt-vs-rewrite if PHASE2 was weak).
