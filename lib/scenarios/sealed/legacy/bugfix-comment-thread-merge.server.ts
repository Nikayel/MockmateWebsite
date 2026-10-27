// Sealed legacy-bugfix answer content (SERVER-ONLY). Moved out of the client
// scenario module so the root cause, ground truth, rubric, and reference solution
// never ship in the browser bundle. The window guard is the runtime seal.
import type { SealedLegacyScenario } from "../legacy-registry.server"

if (typeof window !== "undefined") {
  throw new Error("Sealed legacy scenario content must never load in the browser.")
}

const reference = `def merge_threads(existing_threads, incoming_threads):
    merged = list(existing_threads)
    index_by_id = {thread["id"]: idx for idx, thread in enumerate(merged)}

    for incoming in incoming_threads:
        existing_index = index_by_id.get(incoming["id"])
        if existing_index is not None:
            merged[existing_index] = {**merged[existing_index], **incoming}
        else:
            index_by_id[incoming["id"]] = len(merged)
            merged.append(incoming)

    return merged
`

export const sealed: SealedLegacyScenario = {
  id: "bugfix-comment-thread-merge",
  fixTradeoffs:
    "Compare the submitted merge_threads implementation with the smallest adequate repair: keep index_by_id and accept index zero (>= 0 with the -1 sentinel, or is not None with a None sentinel). Let n be existing threads and m incoming updates; assume bounded thread field counts and average O(1) dictionary operations. Building the index once and maintaining it for appended ids gives O(n + m) time and O(n + m) auxiliary index space in the worst case. A fresh linear search of merged for every incoming update can be correct, but takes O(m * (n + m)) worst-case time as new threads append (O(n * m) when the list does not grow); it avoids the auxiliary index while still allocating the result list. Rebuilding the index inside the loop has the same repeated-work problem. Preserve order, partial-field merging, and last-write-wins semantics; do not recommend a rewrite just to match the reference. No implementation can merge arbitrary n + m inputs in O(1) total time. Identify the actual loop/lookup in the submitted code, explain the trade-off, and place one specific observation in What Worked or Fix Next. If code is incomplete or truncated, say the efficiency is unverified. This is qualitative feedback: do not change pre-calculated scores or infer efficiency from test pass rate or edited-file count.",
  bugDescription:
    "The merge treats a found position of zero as 'not found', so a thread stored at the front of the list is appended a second time instead of updated in place. Every other position updates correctly, and the duplicate leaves the unresolved badge one too high whenever the front thread was still open.",
  groundTruth:
    "Root cause: the presence check rejects a stored position of zero, so the thread at the front of the list is treated as new and duplicated; every other position updates correctly, which is why review and most syncs looked fine. Fix: test presence explicitly instead of by the position's sign, so a stored position of zero counts as found. Survival story: `existing_index > 0` reads as a plausible bounds check and holds for every thread except the one at the front, so it passed review and only the top thread duplicates. Red herrings, all reachable and provably innocent: (1) the merge never removes threads, so an existing resolved thread is preserved by design, not dropped; (2) a batch that repeats an id applies each update in order (last write wins) without creating duplicates; (3) an update for an id not yet local is appended as a new thread, the intended source-of-truth behavior. count_unresolved only excludes resolved threads and is not part of the duplication.",
  rootCauseRubric: [
    "Identifies that the presence check rejects a valid stored position at the front of the list.",
    "Connects the duplicated thread to the badge over-count a reviewer believed, not just to a failing test.",
    "Rules out thread removal, repeated ids, and unknown ids as innocent with evidence.",
    "Names a regression guard such as a front-of-list update test.",
  ],
  referenceFiles: [
    {
      path: "src/comment_threads.py",
      role: "editable",
      language: "python",
      content: reference,
    },
  ],
}
