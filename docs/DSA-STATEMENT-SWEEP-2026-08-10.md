# DSA problem-statement sweep

Every `problemStatement` in `lib/scenarios/dsa` that contained an ASCII diagram was reviewed. All
**29** are fixed. The sweep started as a rendering repair and turned into a content one: **18 of the
29 statements were handing the candidate the algorithm.**

## The rendering bug

`problemStatement` renders through `MarkdownRenderer`. Markdown collapses single line breaks, so any
ASCII art **not** inside a fenced code block reflows into one wrapping paragraph. Every diagram in
the codebase was unfenced, so every one of them was garbled on screen — trees, grids and linked
lists all arrived as a run-on line of slashes and box characters.

The fix is a fenced block. Inside these TypeScript template literals a fence is three backticks each
escaped with a backslash. Wide diagrams (the five minute-by-minute grids in `rotting-oranges`) now
scroll horizontally inside the block instead of destroying the layout.

**11 scenarios** needed only this.

## The content bug

**18 scenarios** also had to lose a spoiler. The statement did not merely illustrate the problem — it
named the technique, or walked through the solution step by step, above the editor, before the
candidate wrote a line. That defeats the exercise: the interview is meant to assess whether someone
can *find* the approach.

| scenario | what the statement gave away |
|---|---|
| `linked-list-cycle` | "Floyd's Algorithm: slow (1 step), fast (2 steps). If they meet, cycle exists" |
| `lru-cache` | drew the full architecture: a hash map wired to a doubly linked list ordered LRU to MRU, with eviction arrows |
| `delete-node-bst` | the three-case recipe: leaf, one child, two children with the inorder successor |
| `lowest-common-ancestor-bst` | the entire decision rule: both smaller go left, both larger go right, otherwise this node |
| `palindrome-linked-list` | three numbered steps: find middle with slow/fast, reverse second half, compare |
| `reorder-list` | three numbered steps: find middle, reverse second half, merge alternately |
| `remove-nth-from-end` | the two-pointer trace with a dummy node and the n-step head start |
| `reverse-linked-list` | the prev/curr/next three-pointer trace |
| `middle-linked-list` | "Technique: slow (1 step) + fast (2 steps)" |
| `merge-two-sorted-lists` | the merge trace led by a dummy node |
| `add-two-numbers` | the digit-by-digit carry walkthrough |
| `clone-graph` | "Use HashMap: oldNode to newNode. DFS/BFS to traverse and clone" |
| `convert-sorted-array-bst` | "Choose middle as root, recursively build", with an arrow pointing at the middle |
| `kth-smallest-bst` | the annotated inorder traversal, indexed by k |
| `range-sum-bst` | the pruning rules: skip the left subtree below low, the right above high |
| `surrounded-regions` | "Strategy: Mark border-connected O's as safe, flip the rest" |
| `valid-binary-search-tree` | "Use min/max bounds while traversing" |
| `walls-and-gates` | "Use multi-source BFS from all gates simultaneously" |

### The finding that made this safe

**In every one of the 18 cases, the same strategy already existed — usually verbatim — in that
scenario's own `hints` array.** So removing it from the statement lost nothing. It simply relocated
the approach to the surface the UI already gates: hints are blurred, unlocked on a timer, revealed
by an explicit click, and hidden entirely once an interview is running. The candidate now chooses
when to see the technique, instead of having it printed above the editor.

Where a diagram's annotation merely restated the problem or labelled the example answer, it was
kept — that is what an example is for. Only method was removed.

Two extras picked up on the way: `subtree-of-another-tree` had a **malformed** subRoot drawing (a
node with a stray child and an inline comment where values belonged), redrawn correctly; and
`convert-sorted-array-bst` now says plainly that any height-balanced arrangement is accepted, which
its property validator has always allowed but its statement implied otherwise.

## Standing rule

> A problem statement states the problem. The `hints` array carries the approach, behind
> click-to-reveal. Diagrams belong in a fenced block, and may label the example answer, but must not
> name a data structure, an algorithm, a traversal, or a sequence of steps.

This is the same rule recorded after the `course-schedule` fix (commit `5c2c451c`), which is what
started the sweep: that statement ended with "Use: Topological Sort or DFS cycle detection".

See also `docs/DSA-SCENARIO-AUDIT-2026-08-10.md`, the companion sweep that hardened the `testCases`
of all 163 DSA scenarios.
