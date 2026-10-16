# SEALED — solution for generic-cache-eviction-mutation

Never candidate-visible. Compiles into `lib/scenarios/sealed/generic-cache-eviction-mutation.server.ts`.

## Two independent causes, not one missing edge case
There are two repairs across two modules. The initial report undercounts `feed`
and overcounts `sessions`. Repairing either alone must still fail the public
regression runner. Do not imply that the first passing row resolves the ticket.

## Eviction defect (src/cache_store.py, in `evict_expired()`)
The sweep walks the entry list by index and calls `entries.pop(index)` when an
entry is expired, then advances `index += 1` unconditionally. Popping shifts
every later entry down one slot, so the entry that slides into the just-vacated
slot is never examined. When two expired entries are adjacent in a namespace's
list, the second one is stepped over and survives the sweep, so that namespace
reports one too many live entries.

Follow the entry point through `log_reader.read_events`, `CacheStore.write`,
`CacheStore.sweep`, and `reporting.format_report`. The `parse_line` function and
formatting module preserve the contract; `sweep` passes each namespace's entries through
`evict_expired` and writes the survivors back to the store. The list returned
by that function determines both the retained state and the report.

## Replay defect (src/log_reader.py, in `read_events()`)
The `seen` set uses `(namespace, key)` as a unique event identity. That pair
identifies a cache entry, NOT a write. Later refreshes of the same entry are
silently dropped before the correctly implemented `CacheStore.write` sees them.
In the incident, `feed,f-1` starts expired and later receives a live expiry. The
refresh is discarded, so repairing eviction alone still reports feed as 1, not 2.

Preserve all valid records in arrival order. The store already replaces the
complete previous record for that namespace/key, so identical duplicate deliveries
do not create additional entries. One straightforward repair is:

```python
def read_events(path):
    events = []
    with open(path, encoding="utf-8") as handle:
        for raw in handle:
            event = parse_line(raw)
            if event is not None:
                events.append(event)
    return events
```

An equivalent compaction may preserve the LAST complete record for each pair.
Never choose the greatest expiry: a later write may intentionally shorten a
lifetime, and metadata such as pinned state must also be replaced. Grade behavior,
not whether the candidate deletes the set or uses an appropriate dictionary.

## Minimal fix
Iterate a snapshot instead of mutating the list under the index, i.e. build the
survivors as a new list:

```python
def evict_expired(entries, now):
    return [entry for entry in entries if entry["expires_at"] > now]
```

Equivalent minimal fix: only advance the index when nothing was popped —

```python
        if entry["expires_at"] <= now:
            entries.pop(index)
        else:
            index += 1
```

## Why the symptom presents as it does
Namespaces are counted independently, and the skip only bites when two expired
entries are adjacent in a namespace's entry list:
- `catalog` = `[c-1 expired, c-2 live, c-3 live, c-4 expired]`: the expired
  entries are separated by live ones, so each is evicted and the count is
  correct at 2.
- `feed`: the first f-1 write is expired and its later refresh is lost. This
  independent replay failure produces 1 instead of 2 even after eviction is fixed.
- `search` = `[q-1 live, q-2 live, q-3 live]`: nothing expires, count 3.
- `sessions` = `[s-1 expired, s-2 expired, s-3 live, s-4 live]`: `s-1` and `s-2`
  are adjacent expired entries. `s-1` is popped, `s-2` slides into slot 0, the
  index advances past it, and `s-2` survives — `sessions` reports 3 instead of
  2. It is the only namespace with two adjacent expired entries, so it is the
  inflated row; feed has the independent undercount.

## Red herrings (both reachable, both provably innocent)
1. `entry["expires_at"] <= now` in `evict_expired()` — the `<=` invites a
   `<`-vs-`<=` off-by-one stare, and it is reachable because `catalog`'s `c-1`
   has `expires_at == now` exactly. The data contract states an entry whose
   expiry equals `now` is expired, so `<=` is correct; switching it to `<`
   would keep `c-1` live and break the currently-correct `catalog` row (2 -> 3),
   and it has no effect on `sessions` (whose expired entries are strictly before
   `now`), so it cannot be the cause of the observed inflation.
2. `part.strip()` normalization in `parse_line()` — normalizing fields looks
   like it could merge or split namespaces, and it is load-bearing: `feed`'s
   `f-2` is written as ` feed ` with surrounding spaces, and the strip folds it
   into the `feed` bucket. The contract declares surrounding whitespace
   trimmed, so the normalization is correct; removing it would split `feed` into
   two rows. It does not explain the discarded refresh or the sessions inflation.

## Public checks are part of the learner run
`python3 fixtures/regression_checks.py fixtures/input.txt` runs the incident and
twelve read-only replay cases, each checking retained state after two sweeps at
the same checkpoint. The shipped code passes 6/12. Both repairs pass 12/12 and
match the report. The oracle includes the individual statuses, so merely printing
the right primary counts is insufficient. Failures describe behavior, not fixes.

## Complexity
Parsing and building the cache are O(n) in the number of log rows. The
survivor-list reference sweep is O(m) per namespace over its m entries. Output
sorts the k namespace names, adding O(k log k): total O(n + k log k), space O(n).

The alternative guarded-index fix is also correct, but repeated `list.pop`
operations still shift later elements. Its sweep can take O(m^2) per namespace,
or O(n^2 + k log k) overall in the worst case. Grade the complexity of the
candidate's actual implementation, not the reference implementation. A correct
minimal patch need not also be a performance rewrite. Do not require a class
redesign: the existing `CacheStore` is sufficient for both tickets.

## Phase-2 adaptation path
Ops asks that pinned entries survive the sweep even when expired. The `pinned`
flag is ALREADY parsed by `parse_line()` into every entry and is simply never
read by `evict_expired()` — the data is in the dataflow and thrown away. Adapt
(do not rewrite): keep an entry when it is pinned OR still live —

```python
def evict_expired(entries, now):
    return [entry for entry in entries if entry["pinned"] or entry["expires_at"] > now]
```

The phase-2 fixture adds two pinned-but-expired writes (`sessions,s-5` and
`search,q-4`). On the unadapted code they are expired and swept away, so the v1
report is unchanged — that silent drop is exactly the ops complaint. With the
fix plus the pinned exemption they stay resident, lifting `search` from 3 to 4
and `sessions` from 2 to 3. Note the fix must land first: on the buggy sweep
`s-5` lands after live entries and is evicted normally, so the buggy report does
not change either.

## Debrief
Deliver the intended mutation-during-iteration flaw vs the candidate's actual
path, what they did well, where signal was lost, and exactly ONE drill
(iterate-a-snapshot / mutation-during-iteration if the SWEEP pass was weak;
adapt-vs-rewrite if PHASE2 was weak).
