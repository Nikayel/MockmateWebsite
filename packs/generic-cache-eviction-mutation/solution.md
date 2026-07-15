# SEALED — solution for generic-cache-eviction-mutation

Never candidate-visible. Compiles into `lib/scenarios/sealed/generic-cache-eviction-mutation.server.ts`.

## Bug (src/cache_sweep.py, in `evict_expired()`)
The sweep walks the entry list by index and calls `entries.pop(index)` when an
entry is expired, then advances `index += 1` unconditionally. Popping shifts
every later entry down one slot, so the entry that slides into the just-vacated
slot is never examined. When two expired entries are adjacent in a namespace's
list, the second one is stepped over and survives the sweep, so that namespace
reports one too many live entries.

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
- `feed` = `[f-1 live, f-2 live, f-3 expired]`: the only expired entry is last
  and correctly evicted, count 2.
- `search` = `[q-1 live, q-2 live, q-3 live]`: nothing expires, count 3.
- `sessions` = `[s-1 expired, s-2 expired, s-3 live, s-4 live]`: `s-1` and `s-2`
  are adjacent expired entries. `s-1` is popped, `s-2` slides into slot 0, the
  index advances past it, and `s-2` survives — `sessions` reports 3 instead of
  2. It is the only namespace with two adjacent expired entries, so it is the
  only wrong row (partial wrongness).

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
   two rows, not touch `sessions`, and again cannot explain the inflation.

## Complexity
Parsing and building the cache are O(n) in the number of log rows. The corrected
sweep is O(m) per namespace over its m entries (the shipped pop-in-a-loop is
O(m^2) in the worst case, an incidental cost of the same defect). Output sorts
only the handful of namespaces, O(k log k) with k namespaces. Time O(n) plus the
small namespace sort; space O(n) for the parsed entries.

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
