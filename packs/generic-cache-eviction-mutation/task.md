# Cache eviction report — live entries per namespace

## Who reads this
The capacity-planning on-call reads this report every morning. It replays the
previous day's cache write log, runs the eviction sweep at a fixed checkpoint,
and reports how many entries are still live in each namespace, so they can size
the memory each namespace needs. This morning one namespace's live count reads
higher than the cache's own metrics endpoint, and the report is not trusted
until the two agree.

## The program
`cache_sweep.py` reads a cache write log and prints the number of live (not yet
expired) entries per namespace, with namespaces listed in alphabetical order.

Each row of the log is a cache write: `namespace,key,expires_at[,pinned]`. The
`expires_at` is an absolute epoch second. The sweep runs at a fixed checkpoint
`now = 1700000000`; an entry is expired when its `expires_at` is at or before
`now`. The log is not grouped by namespace and is not sorted by expiry.

## Data contract (all of this is intended; the correct output tolerates it)
- Lines starting with `#` are comments and are ignored.
- Columns are comma-separated: `namespace,key,expires_at`, with an optional
  fourth column `pinned`. Surrounding whitespace on any field is trimmed, so
  ` feed ` and `feed` are the same namespace.
- `expires_at` is an integer epoch second. An entry is expired when
  `expires_at <= now`, where `now = 1700000000`; an entry whose `expires_at`
  equals `now` exactly is expired.
- A row with fewer than three fields, more than four fields, or a non-integer
  `expires_at` is malformed and is skipped.
- The same key may be written more than once for a namespace; a later write
  refreshes that key's `expires_at` in place (last write wins), and duplicate
  deliveries of the same write are therefore harmless.
- Writes for different namespaces are interleaved and arrive out of order; a
  key first seen as expired may be refreshed to a later expiry by a subsequent
  write.

## Run it
```
python3 src/cache_sweep.py fixtures/input.txt
```

## Expected output
```
=== Live entries by namespace ===
catalog: 2
feed: 2
search: 3
sessions: 2
```

`tests/expected_output.txt` is the oracle. Do not edit it to make the run pass.
