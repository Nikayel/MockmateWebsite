# Cache cleanup: reconcile the overnight report

## The ticket
Our application caches search results, feeds, catalog pages, and login sessions.
Operations replays yesterday's cache writes and runs cleanup at a fixed checkpoint
to check how many entries remain. This morning, one namespace's count is higher
than the cache metrics captured at that same checkpoint. The other counts agree.

Restore the report's accuracy without changing its format or the input contract.
You are working on a local replay, not a running Redis service. No setup, network,
framework, or additional Python packages are needed.

## Enough context to get started
- A **key** identifies one cached entry, such as a search result or login session.
- A **namespace** groups keys for one application feature. The same key text in
  two namespaces represents two independent entries.
- **Expiry** is the time after which an entry should no longer remain in the cache.
  Here, times are integer epoch seconds; compare them as numbers, not dates.
- A **sweep** is one cleanup pass at a given time. This job always uses
  `now = 1700000000`, so each run is reproducible.

## The small codebase
| File | Responsibility |
| --- | --- |
| `src/cache_sweep.py` | Entry point: read writes, update the store, sweep, print. |
| `src/log_reader.py` | Parse rows into entry dictionaries and skip malformed input. |
| `src/cache_store.py` | Own the latest entries and apply cleanup to stored state. |
| `src/reporting.py` | Format counts for operations. |
| `fixtures/input.txt` | A small write log, including refreshes and malformed rows. |

`CacheStore` is an ordinary Python class holding dictionaries in memory. `write`
records an entry, `sweep` updates the stored entries, and `counts` reads their
current sizes. You do not need to design a new class or change every file.

## Run and investigate
```text
python3 src/cache_sweep.py fixtures/input.txt
```

Run once before editing. Compare the actual report with the expected report below,
then follow the data through the modules. Use the editor tabs to inspect files;
the fixture and expected-output file are read-only. Explain what evidence supports
your hypothesis, make a focused change, and run again to verify it.

## Data contract
- Blank lines and lines starting with `#` are ignored.
- Columns are `namespace,key,expires_at[,pinned]`, separated by commas. Surrounding
  whitespace on each field is trimmed: ` feed ` and `feed` name one namespace.
- `expires_at` is an integer. An entry is expired when `expires_at <= now`, including
  an entry whose expiry equals the checkpoint exactly.
- A row with fewer than three columns, more than four columns, or a non-integer
  expiry is malformed and skipped.
- Replay writes in arrival order, not expiry order. A later write for the same
  namespace and key replaces the entire previous entry, including its metadata.
- Interleaved namespaces and duplicate deliveries are valid. Each namespace/key
  pair occupies one slot; a previously expired key can be refreshed by a later write.
- The optional fourth field is recorded as metadata (`pinned` is true only for the
  literal value `pinned`). For this ticket, expiry determines which entries remain.
- Include every namespace seen in a usable row, even if its count becomes zero.
  Print namespaces alphabetically; an empty feed prints only the header.

## Expected output
```text
=== Live entries by namespace ===
catalog: 2
feed: 2
search: 3
sessions: 2
```

`tests/expected_output.txt` is the public expected report. Do not hard-code it or
change reporting rules to match this one fixture. The cleanup must also work for
other valid write logs under the same contract.

## Before handing it back
Verify the report, explain the root cause in your own words, and describe one
small regression case that would have caught it. Keep unrelated parsing and
formatting behavior intact.
