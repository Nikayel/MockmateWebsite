# Debugging fix trade-offs

The comment-thread merge scenario now includes a workload of 10,000 existing
threads and 1,000 incoming updates. After verifying a fix, the interviewer can
probe how it scales and whether a simpler repair preserves the contract.

Normal chat, proactive interviewer turns, and post-interview discussion send the
stable scenario ID. Both the interviewer and AI partner receive the same public
workload and trade-off focus from `lib/bugfix/fix-tradeoffs.ts`, with instructions
suited to their roles. This public context contains no reference repair.

Chat, debrief analysis, and final feedback select the current primary workspace
source rather than the active editor tab, so opening README does not replace the
submitted implementation. The AI partner also receives visible test results.

The feedback stream loads `fixTradeoffs` from the server-only legacy scenario
registry. It asks the feedback model to identify the submitted implementation's
actual lookup/loop and give one concrete observation in What Worked or Fix Next.
This guidance is qualitative: numeric scores and the root-cause rubric remain
unchanged. Test pass rate and edited-file count do not establish efficiency.
If the submitted code is incomplete or truncated, efficiency is unverified.
Trade-off reviews receive up to the existing 30,000-character code input limit,
with an explicit truncation marker at that limit, rather than the old 1,500-character
feedback excerpt. Other scenarios retain their existing excerpt size.

For bounded thread field counts and average constant-time dictionary operations:

| Correct repair | Time | Trade-off |
| --- | --- | --- |
| Keep the ID index and repair its presence check | O(n + m) | Auxiliary index can grow to O(n + m) |
| Search the result for each incoming update | O(m(n + m)) worst case | Avoids the index, repeats scans |

Here n is the existing thread count and m is the incoming update count. Both
repairs must preserve order, partial updates, and last-write-wins behavior. Both
still allocate a result list. Constant-time lookup does not mean constant-time
merging.

Other inspected candidates for future scenario-specific guidance are the burst
rate limiter (capacity calculation versus repeated store reads and temporary
reservations) and event aggregation (set-based versus repeated-scan deduplication,
with sorting considered separately). Neither has new trade-off grading guidance.

The general interviewer instructions also distinguish asynchronous latency,
operation count, and peak concurrency. `Promise.all` overlaps requests; batching
and bounded concurrency address different costs and limits.
