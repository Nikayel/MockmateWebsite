# DSA scenario audit — final report

Every DSA scenario in `lib/scenarios/dsa` was audited by **differential mutation testing**: for each
scenario a correct Python reference solution plus 3+ deliberately-wrong "mutant" solutions were run
through the app's real execution wrapper (`buildPythonWrapper` + `python3`) against the scenario's
own `testCases`. A mutant *survives* when its output matches the reference on every existing case,
which means the test suite cannot tell a correct solution from that wrong one.

## Tally

| | count |
|---|---|
| Scenarios audited | **163** |
| Already strong (no edit needed) | **105** |
| Hardened or bug-fixed | **58** |
| Runtime bugs found and fixed | **2** |
| Content bugs found and fixed | **2** |
| Design limitations recorded (not patchable by test cases) | **1** |
| Survivors proven equivalent / untestable (recorded, not faked) | **13** |

Per pattern: graphs 27, trees 25, dynamic-programming 24, stack 18, two-pointers 17, linked-list 16,
arrays-hashing 14, binary-search 11, binary-search-tree 11.

Gap density fell sharply as the audit progressed — graphs ran ~60% hardened, arrays-hashing ~25%,
two-pointers ~17% — so the weakest scenarios were the older graph ones.

## Bugs found (highest value first)

These are the findings where **a correct candidate solution scored zero**, or a **wrong one scored
full marks**. All are fixed and pushed.

1. **`a313210f` — runtime: a null answer was rewritten to `[]`.** The wrapper decided whether a
   `None` result should serialize as `[]` by inspecting the *input* shape: any tree or list argument
   triggered the rewrite. `dsa-inorder-successor-bst` takes a `root` and legitimately answers `null`
   when no successor exists, so a correct solution was rewritten to `[]` and failed. Now keyed off
   `testCase.expected` — the value that actually knows the answer's shape.
2. **`6e351c01` — runtime: an empty linked-list answer serialized as `null`.** A solution correctly
   returning `None` for an empty list (remove the only node, filter everything out) never matched an
   `[]` answer key. Affected every linked-list scenario whose answer is an empty list.
3. **`1414123b` — content: `top-k-frequent-elements` compared an any-order answer exactly.** A
   heap-based solution emitting `[2,1]` failed a case a count-sorted one passed. Now `compareAsSet`.
4. **`c83a900a` / `e5164ff9` — content: ambiguous or under-determined answer keys.**
   `course-schedule-ii`'s diamond input admitted several valid topological orders while the
   validator compared exactly, so correct DFS solutions failed; an added edge makes the order unique.

Recorded but **not** patched, because no test case can fix them:

- **`first-bad-version` is design-limited.** The real problem hands you an `isBadVersion` API; this
  scenario passes `bad` as an *input*, so `return bad` is trivially correct and binary search can
  never be required. Fixing it means changing the input signature — a product decision.
- **`clone-graph` and `copy-list-random-pointer`** cannot distinguish a deep copy from an alias
  through value comparison; that needs a structural judge.
- **Complexity-only mutants** (binary-search linear scan, longest-valid-parentheses brute force)
  return identical output and are invisible to any answer key.

## Gap taxonomy

Each class is a way a test suite can look complete while admitting a wrong solution.

| | class | example |
|---|---|---|
| a | SYMMETRY — perfect/root-decided inputs let root-only shortcuts pass | `diameter-of-binary-tree`: every longest path ran through the root |
| b | LEAF-vs-INTERNAL — a partial sum hits the target mid-tree | `path-sum`: root alone equalled the target |
| c | UNIFORM-STRUCTURE — every input a forest/permutation, so arithmetic works | `number-connected-components`: answer was always `n - len(edges)` |
| d | ALREADY-ORDERED — natural-order answers hide tie-breaks | `vertical-order-traversal`: column values already sorted |
| e | DISTINCT-VALUES — no duplicate, so `<=` passes where `<` is required | `validate-bst`; `linked-list-cycle` (visited-by-value looked correct) |
| f | ENDS-DECIDE — first/last element determines every answer | `palindrome-linked-list`: comparing only the ends passed |
| g | NEVER-FULL — a cache never reaches capacity, so eviction is untested | `lru-cache`: `put` never had to refresh recency |
| h | CLOSED-FORM COINCIDENCE — the answer equals `max-min`, the sum, or a Fibonacci term | `stock-with-cooldown`: answer always equalled the price range |
| i | ALL-POSITIVE — no negative or zero, so sign handling is untested | `evaluate-reverse-polish`: division never went negative |
| j | EDGE-OPTIMAL — every optimal route runs along a border | `minimum-path-sum`: cheapest path never crossed the middle |
| k | NECESSARY-NOT-SUFFICIENT — a cheap precondition decides every case | `partition-equal-subset-sum`: every false case had an odd sum |
| l | HAZARD-AVOIDED — inputs dodge the trap the problem exists to teach | `encode-decode-strings`: no payload contained the delimiter |
| m | AMBIGUOUS-EXPECTED — the answer is not unique but the test pins one form | `top-k-frequent-elements`, `course-schedule-ii` |
| n | CONSECUTIVE-VALUES — answers coincide with `n+1` or `index+1` | `inorder-successor-bst`: answering `p + 1` matched every tree |
| o | TOO-FEW-CASES — one or two cases leave every mutant alive | `max-frequency-stack` (1 case), `two-sum-bst` (2 cases) |
| p | FIRST-ROW-DECIDES — the answer is always in the first row/segment | `search-2d-matrix`: `target in matrix[0]` passed |
| q | SINGLE-DIGIT / SINGLE-STEP — no accumulation or nesting is exercised | `decode-string`: every repeat count was one digit |
| r | TIE-NEVER-OCCURS — no input produces a tie, so the rule is untested | `max-frequency-stack`: frequency tie-break never exercised |
| s | ADJACENT-DECIDES — the answer sits next to its source | `next-greater-element-i`: a one-step lookahead passed |

## Method notes for whoever picks this up

- Harness: `scratchpad/mutation-harness.mts`, run as
  `npx -y tsx mutation-harness.mts <scenario.ts> <solutions dir>`; the dir holds `ref.py` and any
  number of `mutant-*.py`. Verdicts are **differential** (mutant vs reference), so comparator
  semantics never affect which mutants survive.
- A crashing mutant prints a Python traceback to stdout before the JSON — slice from the first `{`.
- **A failing reference is the highest-value signal.** Twice it was the runtime; once it was my own
  reference (`even-odd-index-sum-difference`, where I coded the range as `0..100` instead of the
  stated `-100..100`). Always decide which side is wrong before editing anything.
- Before declaring a survivor a gap, fuzz it against the reference over ~20k random inputs. Thirteen
  survivors turned out to be correct alternative implementations.
