/**
 * Level 5: Judging Code You Did Not Write (single-file).
 *
 * Levels 1-4 all ask the same thing: write a small function from scratch until hidden tests pass.
 * That is the task a 2026 model performs instantly. This level grades the inverse skill, the one
 * juniors are now screened on: read code you did not author, predict it, find the input that breaks
 * it, write the assertion that catches the bug, and repair it without rewriting it.
 *
 * How judgment is graded with the SAME single-file harness (no engine work):
 *
 *  - **Breaking input.** The plausible-looking function ships in the starter. The learner implements
 *    a function that RETURNS the input on which it misbehaves (the smallest one, or the index of the
 *    first failing case), so the answer is unique and checkable.
 *  - **Write the probe.** The starter defines several candidate implementations in a module-level
 *    registry keyed by name. The learner implements `check(name)` returning True only for the
 *    correct candidates. Test cases cover correct AND buggy candidates, so `return True` fails.
 *  - **Repair.** Generated buggy code is the starterCode; the hidden tests include the edge the happy
 *    path missed.
 *  - **Classify the failure.** `check` widgets in the teach section, with real generated-looking code
 *    in the prompt and the failure modes as options.
 *
 * Authoring contract (verified against `buildPythonWrapper` in
 * `lib/workspace-execution/python-sandbox/dsa-wrapper.ts`, probed empirically):
 *  - The graded function is the LAST top-level `def` in the file (the wrapper reverses the
 *    discovered `def` list before searching). Every exercise here therefore keeps the learner's
 *    function last and says so in the starter comment. Nested `def`s are invisible to the search.
 *  - Never name a function `solution` or `main`: both outrank the authored defs in the candidate
 *    list and would be graded instead.
 *  - `testCases[i].input` is a keyed object; values are passed POSITIONALLY in key order, so key
 *    order must match the parameter order.
 *  - Parameter names `root/tree/node/p/q/t1/t2/left/right/subroot` and `head/list/l1/l2` are
 *    auto-coerced into TreeNode/ListNode when the value is a list. Avoided throughout.
 *  - The returned value is JSON round-tripped, so tuples arrive as lists and dicts compare key-wise.
 */
import type { PythonLesson, PythonLevel } from "../../types"

// ───────────────────────────────────────────────────────────────────────────
// L5-M1: Read It Before You Run It
// ───────────────────────────────────────────────────────────────────────────

const traceFirstLesson: PythonLesson = {
  id: "py-l5-trace-first",
  title: "Trace it before you run it",
  summary:
    "Read unfamiliar code for its contract, hand-trace one ordinary input, then hand-trace the boundary.",
  estimatedMinutes: 22,
  difficulty: "medium",
  skills: ["code reading", "tracing", "boundary analysis", "verification"],
  teach: {
    estimatedMinutes: 9,
    markdown: `## The reflex to unlearn

Someone hands you a function. It might come from a pull request, a teammate, a Stack Overflow answer, or an assistant that produced it in two seconds. The reflex most people have is to run it on the example they already have and, when the output looks right, move on.

That reflex is exactly backwards for generated code, because generated code is fitted to the example you described. The example is the one input it is almost guaranteed to handle. Running it proves the thing you already believed.

The habit that finds real bugs is: read the contract, hand-trace one ordinary input, then hand-trace the boundary input, and only then run it. Tracing costs you thirty seconds and it is the only part of the process where you build a model of what the code actually does rather than what it was supposed to do.

## Step 1: recover the contract

Before you read a single line of the body, write down what the function is supposed to return, in one sentence, including what happens for the awkward inputs. The name and the docstring are claims, not facts, so state the contract in your own words.

\`\`\`python
def page_count(total_items, per_page):
    """How many pages are needed to display total_items items."""
    return total_items // per_page + 1
\`\`\`

Contract in your own words: given a number of items and a page size, return the number of pages needed to show all of them. Zero items needs zero pages. Ten items at ten per page needs one page.

Notice that you just wrote down two boundary claims that the docstring never made. That is the point of the exercise.

## Step 2: trace one ordinary input

Pick an input the author clearly had in mind and walk the body line by line, writing down the value of every name as it changes. For \`page_count(25, 10)\`: \`25 // 10\` is \`2\`, plus \`1\` is \`3\`. Three pages for twenty-five items at ten per page is right.

So far the function looks correct, which is the normal outcome of tracing an ordinary input. Ordinary inputs are not where code fails.

## Step 3: trace the boundary

Now pick the inputs at the edges of the contract you wrote down. For anything that divides, the interesting boundaries are: exactly divisible, one below, one above, and zero.

\`\`\`python
page_count(9, 10)    # 9 // 10 is 0, plus 1 is 1.   One page. Correct.
page_count(10, 10)   # 10 // 10 is 1, plus 1 is 2.  Two pages. WRONG.
page_count(11, 10)   # 11 // 10 is 1, plus 1 is 2.  Two pages. Correct.
page_count(0, 10)    # 0 // 10 is 0, plus 1 is 1.   One page for nothing. WRONG.
\`\`\`

The \`+ 1\` is a fix for the common case that quietly breaks the exact-multiple case. This is the single most common shape of bug in generated code: a correction that is right for most inputs and wrong at the boundary it was meant to handle.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "page-count-first-break",
  "prompt": "For page_count(total_items, per_page) above with per_page = 4, what is the smallest total_items of 1 or more where the function disagrees with the contract?",
  "options": [
    {
      "label": "1, because one item should be zero pages",
      "feedback": "One item genuinely does need a page, so the function returning 1 here is right. The instinct to suspect the smallest input is good, but check what the contract actually asks for before calling it a bug."
    },
    {
      "label": "3, the last value before the page size",
      "feedback": "Close to the boundary but one short. At 3 items the floor division still gives 0, so the plus one produces a single page, which is exactly right."
    },
    {
      "label": "4, the first exact multiple of the page size",
      "correct": true,
      "feedback": "Right. Four items at four per page is one page, but the floor division gives 1 and the plus one pushes it to 2. Every exact multiple after this is wrong too."
    },
    {
      "label": "5, the first value that needs a second page",
      "feedback": "At 5 items the answer really is 2 pages and the function returns 2, so this input passes. It is a natural guess because a second page feels like the new case, but the bug fired one step earlier."
    }
  ]
}
\`\`\`

## The trace table

For anything with a loop, a table beats squinting. One column per name, one row per iteration. Write the row before you look at the next line, not after.

\`\`\`python
def running_total(amounts):
    total = 0
    seen = []
    for amount in amounts:
        total += amount
        seen.append(total)
    return seen
\`\`\`

For \`amounts = [5, -2, 7]\`:

| iteration | amount | total | seen |
| --- | --- | --- | --- |
| start | | 0 | [] |
| 1 | 5 | 5 | [5] |
| 2 | -2 | 3 | [5, 3] |
| 3 | 7 | 10 | [5, 3, 10] |

Three rows and you know the function accumulates rather than replaces, that negative amounts are handled, and that an empty input returns an empty list rather than crashing. None of that was obvious from the name.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "trace-accumulator-init",
  "prompt": "An assistant wrote this: def running_peak(values): best = 0; out = []; for v in values: best = max(best, v); out.append(best); return out. Which input first shows that it disagrees with 'out[i] is the largest value in values[:i+1]'?",
  "options": [
    {
      "label": "[] , because an empty list has no peak",
      "feedback": "An empty list produces an empty list here, which matches the contract exactly. Empty input is always worth checking, but this loop never runs so there is nothing to get wrong."
    },
    {
      "label": "[0, 0, 0], because zero is a falsy value",
      "feedback": "Falsiness never enters this code: max compares numbers, it does not test truthiness. The trace gives 0 at every position, which is the correct answer for this input."
    },
    {
      "label": "[-4, -9], because every value is below the seeded starting point",
      "correct": true,
      "feedback": "Right. Seeding best at 0 quietly asserts that the data is never negative. The first element should be -4 and the function reports 0, so the very first output is wrong."
    },
    {
      "label": "[3, 1, 4], because the peak has to be recomputed when a value drops",
      "feedback": "This is the input the author had in mind, and the function handles it correctly, returning [3, 3, 4]. Tempting because a dropping value looks like the tricky case, but the running max carries forward fine."
    }
  ]
}
\`\`\`

## What to write down while you read

Four notes, every time, before you run anything:

1. **The contract**, in your own words, including the awkward inputs.
2. **The types** each parameter is assumed to be. Generated code often assumes a list where a string could arrive, or an int where a float could.
3. **The boundaries** the body implies: any division, any index, any comparison, any accumulator seeded with a literal.
4. **What is mutated.** A function that sorts its argument in place changes the caller's data.

Then run it, on the boundary inputs first.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "boundary-from-the-body",
  "prompt": "Each line below appears in a function you are reviewing. Sort each one by the boundary it forces you to check first.",
  "buckets": ["Check the empty input", "Check the exact-multiple or zero divisor"],
  "items": [
    {
      "label": "return sum(values) / len(values)",
      "bucket": "Check the empty input",
      "feedback": "An empty list makes len(values) zero, so this raises ZeroDivisionError before any averaging happens."
    },
    {
      "label": "return values[0]",
      "bucket": "Check the empty input",
      "feedback": "Indexing position zero assumes at least one element, so an empty list raises IndexError."
    },
    {
      "label": "return total // size + 1",
      "bucket": "Check the exact-multiple or zero divisor",
      "feedback": "Floor division plus a correction is right until total is an exact multiple of size, where it overcounts by one."
    },
    {
      "label": "return max(counts) / min(counts)",
      "bucket": "Check the exact-multiple or zero divisor",
      "feedback": "A zero anywhere in counts makes min zero, and dividing by it raises. An empty list also raises, so this line earns both checks."
    }
  ]
}
\`\`\`

**Interview nuance:** when an interviewer pastes code and asks "what does this do," they are not testing whether you can run it. They are watching whether you name the contract first, then reach for the boundary rather than the example. Saying "this looks like a ceiling division, so I want to see what it does when the numbers divide exactly" is a stronger answer than any correct output you could recite.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "trace-first-cumulative",
  "prompt": "You are reviewing a generated function and you have thirty seconds. What is the highest-value thing to do with them?",
  "options": [
    {
      "label": "Run it on the example from the ticket and confirm the output matches",
      "feedback": "This is the check the code is most likely to pass, because whoever generated it was given that example. It confirms what you already believed rather than testing anything."
    },
    {
      "label": "Read it for style and naming so the diff is consistent with the codebase",
      "feedback": "Worth doing eventually, and easy to do quickly, which is why reviews drift towards it. Style comments never catch the boundary bug that reaches production."
    },
    {
      "label": "State the contract in your own words, then trace the boundary input the body implies",
      "correct": true,
      "feedback": "Right. Naming the contract is what turns a vague unease into a specific input to try, and the body tells you which boundary matters: a division, an index, or a seeded accumulator."
    },
    {
      "label": "Rewrite it yourself and compare the two versions line by line",
      "feedback": "A real technique, and useful when the function is short and the stakes are high. It costs far more than thirty seconds though, and you still need the contract before your version means anything."
    }
  ],
  "reveal": "The order that finds bugs is contract, trace, boundary, run. Running first is not wrong, it is just the step that teaches you the least, so it belongs last."
}
\`\`\``,
    demoCode: `def page_count(total_items, per_page):
    """How many pages are needed to display total_items items."""
    return total_items // per_page + 1


# Trace the boundary before you trust it.
for total in [9, 10, 11, 0]:
    print(total, "items ->", page_count(total, 10), "pages")`,
  },
  apply: {
    id: "py-l5-trace-first-apply",
    executionMode: "single-file",
    prompt: `Write a function \`smallest_broken_total(per_page)\` that returns the smallest \`total_items\`
of 1 or more for which the \`page_count\` function in the starter disagrees with its contract.

The contract: \`page_count(total_items, per_page)\` must return the number of pages of \`per_page\`
items needed to show \`total_items\` items, so 9 items at 10 per page is 1 page and 10 items at
10 per page is also 1 page.

Do not fix \`page_count\`. Your job is to find the input that exposes it. Keep
\`smallest_broken_total\` as the last function in the file.`,
    starterCode: `def page_count(total_items, per_page):
    # Generated code under review. Leave it exactly as it is.
    return total_items // per_page + 1


def smallest_broken_total(per_page):
    # Return the smallest total_items >= 1 where page_count is wrong.
    pass`,
    hints: [
      "Write the correct answer yourself first. Ceiling division is `-(-total_items // per_page)`.",
      "Then walk `total_items` upward from 1 and return the first value where the two disagree.",
      "Trace `per_page = 10` by hand at totals 9, 10, and 11 before you write the loop.",
    ],
    referenceSolution: `def page_count(total_items, per_page):
    return total_items // per_page + 1


def correct_page_count(total_items, per_page):
    return -(-total_items // per_page)


def smallest_broken_total(per_page):
    for total in range(1, per_page * 3 + 4):
        if page_count(total, per_page) != correct_page_count(total, per_page):
            return total
    return -1`,
    testCases: [
      { input: { per_page: 10 }, expected: 10, description: "ten items per page" },
      { input: { per_page: 3 }, expected: 3, description: "three items per page" },
      { input: { per_page: 1 }, expected: 1, description: "one item per page" },
      { input: { per_page: 7 }, expected: 7, description: "seven items per page" },
    ],
  },
  practice: {
    id: "py-l5-trace-first-practice",
    executionMode: "single-file",
    prompt: `Your team's habit tracker reports the longest run of consecutive days a user logged an
activity, and an assistant wrote the \`longest_streak\` function in the starter. It passed the two
examples in the ticket, so it shipped. Support is now getting reports that some streaks read low.

Write a function \`first_failing_case(cases)\` that takes a list of day-lists and returns the index
of the first day-list on which \`longest_streak\` disagrees with its contract, or \`-1\` if it handles
all of them.

The contract: \`longest_streak(days)\` returns the length of the longest run of consecutive \`True\`
values in \`days\`, and \`0\` for a list with no \`True\` in it. Keep \`first_failing_case\` as the last
function in the file.`,
    starterCode: `def longest_streak(days):
    # Generated code under review. Leave it exactly as it is.
    best = 0
    current = 0
    for day in days:
        if day:
            current += 1
        else:
            best = max(best, current)
            current = 0
    return best


def first_failing_case(cases):
    # Return the index of the first day-list longest_streak gets wrong, or -1.
    pass`,
    hints: [
      "Write your own correct streak counter first. It is the same loop plus one line after it.",
      "Trace `[True, True]` by hand: what does `best` hold when the loop ends?",
      "Loop over `cases` with `enumerate` and return the index the moment the two answers differ.",
    ],
    referenceSolution: `def longest_streak(days):
    best = 0
    current = 0
    for day in days:
        if day:
            current += 1
        else:
            best = max(best, current)
            current = 0
    return best


def correct_streak(days):
    best = 0
    current = 0
    for day in days:
        if day:
            current += 1
            best = max(best, current)
        else:
            current = 0
    return best


def first_failing_case(cases):
    for index, days in enumerate(cases):
        if longest_streak(days) != correct_streak(days):
            return index
    return -1`,
    testCases: [
      {
        input: {
          cases: [
            [true, false, true],
            [false, true, true],
          ],
        },
        expected: 1,
        description: "the second case ends mid-streak",
      },
      {
        input: { cases: [[], [false], [true, true, false]] },
        expected: -1,
        description: "every run is closed by a false, so nothing is missed",
      },
      {
        input: { cases: [[true], [false, false]] },
        expected: 0,
        description: "a single logged day is already enough to break it",
      },
      {
        input: {
          cases: [
            [false, false],
            [true, false],
            [false, true],
          ],
        },
        expected: 2,
        description: "the trailing streak is the one that is dropped",
      },
    ],
  },
}

const happyPathLesson: PythonLesson = {
  id: "py-l5-happy-path",
  title: "The happy path is not the test",
  summary:
    "Generated code is fitted to the example you gave it, so the example proves nothing. Learn the boundary catalogue and write a probe that separates correct candidates from plausible ones.",
  estimatedMinutes: 24,
  difficulty: "medium",
  skills: ["edge cases", "test design", "code review", "verification"],
  teach: {
    estimatedMinutes: 10,
    markdown: `## Why the example always passes

When you ask for a function and give an example, you have handed over the test. Whatever produced the code, human or model, optimized for that example. So the example passing tells you almost nothing, and the confident tone of the response tells you less.

Here is the shape you will see constantly. The task: "return the second largest distinct value in a list, or None if there is not one." The example: \`[3, 1, 4]\` should give \`3\`.

\`\`\`python
def second_largest(nums):
    ordered = sorted(set(nums))
    return ordered[1] if len(ordered) >= 2 else None
\`\`\`

Run the example. \`sorted(set([3, 1, 4]))\` is \`[1, 3, 4]\`, and index \`1\` is \`3\`. Correct. It even handles the empty list and the single-value list, which looks like careful work.

It is wrong. \`ordered[1]\` is the second **smallest**. With three distinct values the second smallest and the second largest are the same element, so the example cannot tell them apart. Feed it \`[1, 2, 3, 4]\` and it returns \`2\` where the answer is \`3\`.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "second-largest-index-bug",
  "prompt": "Which single input proves that second_largest above uses the wrong index?",
  "options": [
    {
      "label": "[] , the empty list",
      "feedback": "A good habit and the wrong tool here. The guard returns None for an empty list, which is exactly what the contract asks for, so this input passes."
    },
    {
      "label": "[7, 7], two copies of the same value",
      "feedback": "This is a real boundary and worth testing, but set() collapses it to one value and the guard returns None, which is correct. It catches a different bug than the one in this body."
    },
    {
      "label": "[1, 2, 3, 4], four distinct values",
      "correct": true,
      "feedback": "Right. With four distinct values the second smallest is 2 and the second largest is 3, so the two readings finally disagree. Three distinct values would still pass."
    },
    {
      "label": "[-5, -1], two negative values",
      "feedback": "Negatives are a boundary worth keeping on your list, but sorting handles them correctly. With only two distinct values the second smallest is also the second largest, so the bug stays hidden."
    }
  ]
}
\`\`\`

## The boundary catalogue

Reviewing well is mostly recall. Keep a short list and walk it against the contract every time.

| Boundary | The input to try | What it catches |
| --- | --- | --- |
| Empty | \`[]\`, \`""\`, \`{}\` | indexing, division by length, \`max\` on nothing |
| One | \`[x]\` | anything that compares neighbours or takes a pair |
| Two versus many | \`[a, b]\` versus \`[a, b, c, d]\` | index confusion that a short example hides |
| Duplicates | \`[5, 5]\` | uniqueness assumptions, tie-breaking |
| All equal | \`[3, 3, 3]\` | ranges, spreads, second-place logic |
| Zero | \`0\` in the data | division, truthiness, seeded accumulators |
| Negative | \`-4\` | accumulators seeded at 0, absolute values, clamps |
| Missing | \`None\` in the data | arithmetic and comparison against None |
| Order | already sorted, reverse sorted | code that assumes it can stop early |

Nothing on that list is clever. It is a checklist, and a checklist is what makes the review repeatable when you are tired.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "pick-the-boundary",
  "prompt": "You are reviewing a function that returns the largest gap between consecutive elements of a sorted list of prices. Sort each input by whether it is the happy path or a real boundary for this contract.",
  "buckets": ["Happy path, proves little", "Boundary worth trying"],
  "items": [
    {
      "label": "[10, 14, 15, 30]",
      "bucket": "Happy path, proves little",
      "feedback": "Four increasing prices with distinct gaps is the shape the author had in mind, so it is the input most likely to pass."
    },
    {
      "label": "[12]",
      "bucket": "Boundary worth trying",
      "feedback": "One element means zero consecutive pairs, so the function has to decide what a largest gap even means here rather than crash."
    },
    {
      "label": "[8, 8, 8]",
      "bucket": "Boundary worth trying",
      "feedback": "All-equal makes every gap zero, which exposes any code that seeded its running maximum with a value it never revisits."
    },
    {
      "label": "[3, 9, 20, 41]",
      "bucket": "Happy path, proves little",
      "feedback": "Another well-behaved increasing list. Adding a second happy-path example feels like more coverage and adds none."
    },
    {
      "label": "[]",
      "bucket": "Boundary worth trying",
      "feedback": "No elements means no pairs and usually an IndexError or a max() over an empty sequence."
    }
  ]
}
\`\`\`

## Turning the catalogue into a probe

Reading a boundary list is one thing. The skill that gets you hired is turning it into code that answers a yes or no question about someone else's function.

A **probe** is a function that takes a candidate implementation and returns whether it is correct, by calling it on inputs you chose. It is a test, written from the outside, with no view of the body.

\`\`\`python
def is_correct(fn):
    cases = [
        ([3, 1, 4], 3),        # the happy path, so a broken probe is obvious
        ([1, 2, 3, 4], 3),     # four distinct values: catches the index confusion
        ([7, 7], None),        # duplicates collapse to one distinct value
        ([], None),            # empty
        ([9], None),           # single
    ]
    for nums, expected in cases:
        if fn(list(nums)) != expected:
            return False
    return True
\`\`\`

Three details in there are worth stealing.

First, \`fn(list(nums))\` passes a **copy**. If the candidate sorts its argument in place, the original case data is corrupted for every later assertion and your probe starts lying.

Second, every case is a pair of input and expected value, so the probe reads as a specification rather than a pile of calls.

Third, the happy path is still in the list. It is not there to catch anything. It is there so that a probe which is itself broken fails loudly on the easy case instead of silently rejecting everything.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "probe-that-never-fails",
  "prompt": "A colleague's probe is: def is_correct(fn): return fn([3, 1, 4]) == 3. It reports that all six candidate implementations are correct. What has it actually established?",
  "options": [
    {
      "label": "All six are correct, since they agree on the same input",
      "feedback": "Agreement on one input is not correctness. Six implementations that were all written against the same example will all pass that example, including the broken ones."
    },
    {
      "label": "That all six handle the one input the example already covered",
      "correct": true,
      "feedback": "Right. A probe with one happy-path case can only ever confirm the happy path, so a unanimous pass is evidence about the probe, not about the candidates."
    },
    {
      "label": "Nothing at all, because a single assertion is never a test",
      "feedback": "Too strong. One assertion does establish something real, just something small: these six do not fall over on the ordinary case. The mistake is treating that as a verdict."
    },
    {
      "label": "That the candidates share a bug the probe cannot see",
      "feedback": "It might be true, and it is the right suspicion to hold, but the probe gives you no evidence either way. You would need a case that separates them before you could claim it."
    }
  ]
}
\`\`\`

## The probe has to be able to fail

The last rule is the one people skip. Before you trust a probe, run it against an implementation you **know** is broken and confirm it says no. A probe that returns \`True\` for everything is worse than no probe, because it converts an unknown into a false reassurance.

That is exactly how the exercises below are graded: your probe is run against correct candidates and against broken ones, so a probe that always agrees fails immediately.

**Interview nuance:** "how would you test this?" is now a more common interview question than "how would you write this?", and the answer that lands is not a list of frameworks. It is naming two concrete inputs that distinguish a correct implementation from a plausible one, and saying what each is for. That is a thirty second answer and almost nobody gives it.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "happy-path-cumulative",
  "prompt": "You are asked to verify four candidate implementations of one function. You have time to pick three test inputs. What should they be?",
  "options": [
    {
      "label": "Three realistic inputs drawn from production data",
      "feedback": "Realistic data is valuable for confidence and terrible for discrimination, because production is mostly ordinary. Three ordinary inputs will usually pass all four candidates."
    },
    {
      "label": "The happy path, plus two boundaries the contract implies",
      "correct": true,
      "feedback": "Right. The happy path keeps a broken probe honest, and the boundaries do the separating. The contract tells you which boundaries matter: division, indexing, emptiness, duplicates."
    },
    {
      "label": "Three boundaries, since the happy path is known to pass",
      "feedback": "Close, and the instinct to spend your budget on boundaries is correct. Dropping the happy path costs you the one case that tells you your own probe still works."
    },
    {
      "label": "One input per candidate, chosen after reading each body",
      "feedback": "Reading the bodies is useful, but tailoring an input to each one tests your reading rather than the contract. A probe built from the contract catches bugs you did not spot while reading."
    }
  ],
  "reveal": "A probe is a specification you can run. Build it from the contract, include the happy path so it can pass, and prove it can fail before you believe it."
}
\`\`\``,
    demoCode: `def second_largest(nums):
    ordered = sorted(set(nums))
    return ordered[1] if len(ordered) >= 2 else None


# The example from the ticket, and the input that separates the readings.
print(second_largest([3, 1, 4]))       # 3, looks right
print(second_largest([1, 2, 3, 4]))    # 2, and the answer is 3`,
  },
  apply: {
    id: "py-l5-happy-path-apply",
    executionMode: "single-file",
    prompt: `Write a function \`check(name)\` that returns \`True\` only when the candidate implementation
stored under \`name\` is a correct \`second_largest\`, and \`False\` otherwise.

The contract: \`second_largest(nums)\` returns the second largest **distinct** value in \`nums\`, or
\`None\` when \`nums\` has fewer than two distinct values.

The starter holds four candidates in the \`CANDIDATES\` dictionary. Look up the function with
\`CANDIDATES[name]\`, call it on inputs you choose, and decide. Two of the four are correct. Your
answer is graded by running it against correct candidates and broken ones, so \`return True\` fails.
Keep \`check\` as the last function in the file.`,
    starterCode: `def alpha(nums):
    ordered = sorted(set(nums), reverse=True)
    return ordered[1] if len(ordered) >= 2 else None


def beta(nums):
    if len(nums) < 2:
        return None
    return sorted(nums, reverse=True)[1]


def gamma(nums):
    best = None
    second = None
    for n in nums:
        if best is None or n > best:
            second = best
            best = n
        elif n != best and (second is None or n > second):
            second = n
    return second


def delta(nums):
    ordered = sorted(set(nums))
    return ordered[1] if len(ordered) >= 2 else None


CANDIDATES = {"alpha": alpha, "beta": beta, "gamma": gamma, "delta": delta}


def check(name):
    # Probe CANDIDATES[name] and return True only if it satisfies the contract.
    pass`,
    hints: [
      "Build a list of `(nums, expected)` pairs from the contract, then call the candidate on each.",
      "Duplicates separate one broken candidate: `[7, 7]` has only one distinct value, so the answer is None.",
      "Four distinct values separate the other: with `[1, 2, 3, 4]` the second smallest is 2 and the answer is 3.",
    ],
    referenceSolution: `def alpha(nums):
    ordered = sorted(set(nums), reverse=True)
    return ordered[1] if len(ordered) >= 2 else None


def beta(nums):
    if len(nums) < 2:
        return None
    return sorted(nums, reverse=True)[1]


def gamma(nums):
    best = None
    second = None
    for n in nums:
        if best is None or n > best:
            second = best
            best = n
        elif n != best and (second is None or n > second):
            second = n
    return second


def delta(nums):
    ordered = sorted(set(nums))
    return ordered[1] if len(ordered) >= 2 else None


CANDIDATES = {"alpha": alpha, "beta": beta, "gamma": gamma, "delta": delta}


def check(name):
    fn = CANDIDATES[name]
    cases = [
        ([3, 1, 4], 3),
        ([1, 2, 3, 4], 3),
        ([7, 7], None),
        ([], None),
        ([9], None),
        ([-5, -1, -9], -5),
    ]
    for nums, expected in cases:
        if fn(list(nums)) != expected:
            return False
    return True`,
    testCases: [
      { input: { name: "alpha" }, expected: true, description: "candidate alpha" },
      { input: { name: "beta" }, expected: false, description: "candidate beta" },
      { input: { name: "gamma" }, expected: true, description: "candidate gamma" },
      { input: { name: "delta" }, expected: false, description: "candidate delta" },
    ],
  },
  practice: {
    id: "py-l5-happy-path-practice",
    executionMode: "single-file",
    prompt: `A marketplace shows a rating summary under every listing. An assistant produced the
\`summarize_ratings\` function in the starter, it matched the screenshot in the ticket, and it
shipped. Overnight, every listing with no reviews yet started returning a 500.

Repair \`summarize_ratings\` so it satisfies its contract on the inputs the happy-path example
never covered.

The contract: \`scores\` is a list where a customer who left a review has an integer rating and a
customer who did not is recorded as \`None\`. Return a dictionary with \`"count"\` (how many real
ratings there are), \`"average"\` (their mean, rounded to one decimal place), and \`"top"\` (the
highest real rating). When there is no real rating at all, return
\`{"count": 0, "average": 0.0, "top": None}\`.`,
    starterCode: `def summarize_ratings(scores):
    # Generated code. It matched the example in the ticket and nothing else.
    return {
        "count": len(scores),
        "average": round(sum(scores) / len(scores), 1),
        "top": max(scores),
    }`,
    hints: [
      "Filter first: build the list of real ratings with `[s for s in scores if s is not None]`.",
      "Handle the no-ratings case before any division, indexing, or `max` call.",
      "`round(sum(real) / len(real), 1)` only runs once you know `real` is non-empty.",
    ],
    referenceSolution: `def summarize_ratings(scores):
    real = [s for s in scores if s is not None]
    if not real:
        return {"count": 0, "average": 0.0, "top": None}
    return {
        "count": len(real),
        "average": round(sum(real) / len(real), 1),
        "top": max(real),
    }`,
    testCases: [
      {
        input: { scores: [5, 4, 3] },
        expected: { count: 3, average: 4.0, top: 5 },
        description: "the example from the ticket still passes",
      },
      {
        input: { scores: [] },
        expected: { count: 0, average: 0.0, top: null },
        description: "a listing with no reviews yet",
      },
      {
        input: { scores: [null, null] },
        expected: { count: 0, average: 0.0, top: null },
        description: "customers who left no rating",
      },
      {
        input: { scores: [4, null, 5] },
        expected: { count: 2, average: 4.5, top: 5 },
        description: "real ratings mixed with blanks",
      },
    ],
  },
}

const failureSignaturesLesson: PythonLesson = {
  id: "py-l5-failure-signatures",
  title: "The failure signatures of generated code",
  summary:
    "Seven shapes account for most bugs in code you did not write. Learn to name them on sight, then repair a function that swallows its own errors.",
  estimatedMinutes: 24,
  difficulty: "medium",
  skills: ["code review", "debugging", "error handling", "verification"],
  teach: {
    estimatedMinutes: 10,
    markdown: `## Bugs come in shapes

Reviewing gets fast when you stop looking for "a bug" and start looking for known shapes. Code written quickly by anyone, human or model, fails in a small number of recognisable ways. Seven of them cover most of what you will actually find.

### 1. Off by one at a boundary

The correction that is right in the common case and wrong at the edge.

\`\`\`python
def page_count(total, per_page):
    return total // per_page + 1     # wrong on every exact multiple
\`\`\`

Signature: an arithmetic \`+ 1\` or \`- 1\`, a slice bound, or \`range(1, n)\` versus \`range(n)\`. Test the exact multiple, the first element, and the last element.

### 2. Unhandled empty or None

The function assumes there is at least one of something, or that a value is present.

\`\`\`python
def busiest_hour(counts):
    return counts.index(max(counts))     # ValueError on []
\`\`\`

Signature: \`max\`, \`min\`, \`[0]\`, \`[-1]\`, or division by \`len(...)\` with no guard above it. Test \`[]\`, and test data with a \`None\` in it.

### 3. Silently swallowed errors

The one that costs the most in production, because it produces no signal at all.

\`\`\`python
for row in rows:
    try:
        values[row.split("=")[0]] = int(row.split("=")[1])
    except Exception:
        pass                              # the bad rows just vanish
\`\`\`

Signature: \`except Exception: pass\`, \`except: continue\`, or a \`try\` block wrapping more lines than the one that can actually fail. A dropped row is indistinguishable from a row that was never there, so the report is quietly short and nobody finds out for a month.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "silent-except-cost",
  "prompt": "A config loader wraps its parse loop in try/except Exception: pass. Ten of a thousand rows are malformed. What does the system do?",
  "options": [
    {
      "label": "It crashes on the first malformed row, so the problem is found immediately",
      "feedback": "That is what you would want, and it is what would happen without the except. The bare except is precisely what converts a loud failure into a silent one."
    },
    {
      "label": "It logs a warning for each malformed row and carries on",
      "feedback": "Reasonable to assume, because that is what a careful implementation does. But pass does not log anything: it discards the exception object and moves to the next iteration."
    },
    {
      "label": "It returns 990 rows and reports complete success",
      "correct": true,
      "feedback": "Right, and this is the expensive part. Nothing distinguishes a dropped row from a row that never existed, so every downstream total is quietly low and the run looks clean."
    },
    {
      "label": "It returns 1000 rows with None in the ten bad positions",
      "feedback": "That would at least leave a trace you could find later. The except fires before any assignment happens, so nothing is written for those rows at all."
    }
  ]
}
\`\`\`

### 4. The wrong side of a comparison

\`>\` where the policy said "at or above", \`<=\` where it said "strictly under". No crash, no clue, and the difference shows up only on the exact boundary value.

\`\`\`python
def sla_breached(hours_open, sla_hours):
    return hours_open > sla_hours    # policy says "at or above", so equality is missed
\`\`\`

Signature: any comparison against a threshold, a limit, a quota, or an expiry. Always test the exact threshold value.

### 5. The ignored return value

Python's string and tuple methods return new objects. Calling one and throwing away the result is a no-op that looks like work.

\`\`\`python
def redact(text, secrets):
    for secret in secrets:
        text.replace(secret, "[REDACTED]")   # result discarded, text unchanged
    return text
\`\`\`

Signature: a bare method call on its own line whose object is immutable. \`str.replace\`, \`str.strip\`, \`str.upper\`, \`sorted\`, and \`list.copy\` all return; \`list.sort\`, \`list.append\`, and \`dict.update\` all mutate. Mixing the two conventions up is a top-three cause of "it does nothing and does not error".

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "ignored-return-value",
  "prompt": "With redact above, what is the result of redact('token abc123', ['abc123'])?",
  "options": [
    {
      "label": "'token [REDACTED]'",
      "feedback": "That is what the code was meant to do and what a quick read suggests. str.replace builds and returns a new string though, and nothing here captures it."
    },
    {
      "label": "'token abc123', unchanged",
      "correct": true,
      "feedback": "Right. Strings are immutable, so replace cannot alter text in place. The new string is created, discarded, and the original is returned."
    },
    {
      "label": "'token abc123' with a warning printed to stderr",
      "feedback": "Python does not warn about discarded return values, which is exactly why this bug survives. The expression is legal and its result is simply dropped."
    },
    {
      "label": "A TypeError, because replace needs an assignment target",
      "feedback": "A method call is a valid statement on its own, so there is no syntax or type problem here. The code runs cleanly and accomplishes nothing."
    }
  ]
}
\`\`\`

### 6. The API that does not exist

Confident calls to methods, keyword arguments, or modules that were never in the library. \`str.rreplace\`, \`sorted(x, cmp=...)\`, \`dict.get_or_default\`. These at least fail loudly, unless someone wrapped them in a \`try\`.

### 7. The complexity you did not ask for

Correct output, wrong cost. A membership test against a list inside a loop, \`list.pop(0)\` in a queue, string concatenation in a loop. It passes every test on ten rows and falls over on a hundred thousand.

## Sorting a bug into its shape

Naming the shape tells you the test to write. That is the whole payoff.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "sort-the-signature",
  "prompt": "Each line comes from a function you are reviewing. Sort each one by how it will fail.",
  "buckets": ["Silently wrong", "Raises on some input", "Right answer, wrong cost"],
  "items": [
    {
      "label": "name.strip()",
      "bucket": "Silently wrong",
      "feedback": "strip returns a new string. On its own line the result is dropped and the original keeps its whitespace."
    },
    {
      "label": "return sum(values) / len(values)",
      "bucket": "Raises on some input",
      "feedback": "An empty list makes len zero, so this raises ZeroDivisionError rather than returning anything wrong."
    },
    {
      "label": "if item in seen_list:",
      "bucket": "Right answer, wrong cost",
      "feedback": "Membership in a list scans it, so inside a loop this is quadratic. The answers are correct until the input grows."
    },
    {
      "label": "return balance > limit",
      "bucket": "Silently wrong",
      "feedback": "If the policy says at or above the limit, the equality case is missed and no error is ever raised."
    },
    {
      "label": "config = json.loads(response)",
      "bucket": "Raises on some input",
      "feedback": "Any response that is not valid JSON raises JSONDecodeError right here, before any field is read."
    },
    {
      "label": "output += line + chr(10)",
      "bucket": "Right answer, wrong cost",
      "feedback": "Each concatenation copies the whole accumulated string, so building a large document this way is quadratic in its length."
    }
  ]
}
\`\`\`

## Errors are data, not noise

The repair for a swallowed error is almost never "let it crash". It is to make the failure visible in the value the function returns, so the caller can decide.

\`\`\`python
def load_thresholds(rows):
    values = {}
    rejected = []
    for row in rows:
        try:
            name, raw = row.split("=")
            values[name] = int(raw)
        except ValueError:
            rejected.append(row)       # the row is reported, not deleted
    return {"values": values, "rejected": rejected}
\`\`\`

Two changes carry all the weight. The \`except\` names \`ValueError\` rather than \`Exception\`, so a typo in your own code inside that block still crashes the way it should. And the bad row leaves the function in the return value, so a caller can count it, log it, or refuse to start.

**Interview nuance:** when you are asked to review code out loud, naming the shape is the move. "This except swallows everything, so a malformed row is indistinguishable from a missing row" is a specific, testable claim. "This error handling could be better" is not, and interviewers hear the difference immediately.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "failure-signature-cumulative",
  "prompt": "You are reviewing a generated function and you spot except Exception: pass around a parse loop. What is the strongest single change to ask for?",
  "options": [
    {
      "label": "Delete the try/except so failures are loud",
      "feedback": "It does restore the signal, and for a small script it may be right. For a batch job it means one malformed row out of a million kills the whole run, which is usually worse."
    },
    {
      "label": "Narrow the except to the expected error and return the rejected rows",
      "correct": true,
      "feedback": "Right. Narrowing keeps your own bugs loud, and returning the rejects makes the failure a value the caller can count, log, or refuse to proceed on."
    },
    {
      "label": "Add a print inside the except so the problem is visible in the logs",
      "feedback": "Better than nothing and a genuine improvement in a script. In a service it buries the signal in log volume, and the function still reports success to its caller."
    },
    {
      "label": "Wrap the whole function in a retry so transient failures resolve themselves",
      "feedback": "Retrying is the right answer for a flaky network call, so the instinct transfers from somewhere real. A malformed row is deterministic and will fail identically on every attempt."
    }
  ],
  "reveal": "Off by one, unhandled empty, swallowed error, wrong comparison side, ignored return value, invented API, wrong cost. Naming the shape is what turns a vague worry into the test you write next."
}
\`\`\``,
    demoCode: `def redact(text, secrets):
    for secret in secrets:
        text.replace(secret, "[REDACTED]")   # result discarded
    return text


print(redact("token abc123", ["abc123"]))   # token abc123, unchanged`,
  },
  apply: {
    id: "py-l5-failure-signatures-apply",
    executionMode: "single-file",
    prompt: `Repair \`load_thresholds(rows)\` in the starter so that a row it cannot parse is reported
instead of dropped.

The contract: each row is a string of the form \`"name=value"\` where \`value\` is an integer. Return
a dictionary with \`"values"\` (the parsed \`name\` to integer mapping, in the order the rows arrived)
and \`"rejected"\` (the raw rows that did not parse, in the order they arrived).

The generated version swallows every failure with \`except Exception: pass\`, so a malformed row is
indistinguishable from a row that was never sent. Narrow the exception it catches and put the bad
rows in the return value.`,
    starterCode: `def load_thresholds(rows):
    # Generated code. Every failure disappears here.
    values = {}
    for row in rows:
        try:
            name, raw = row.split("=")
            values[name] = int(raw)
        except Exception:
            pass
    return {"values": values, "rejected": []}`,
    hints: [
      "Collect a `rejected` list alongside `values` and append `row` inside the except block.",
      "Catch `ValueError` rather than `Exception`: both a bad integer and a row with the wrong number of `=` signs raise it.",
      'A row like `"a=1=2"` fails when unpacking into two names, and `"broken"` fails the same way.',
    ],
    referenceSolution: `def load_thresholds(rows):
    values = {}
    rejected = []
    for row in rows:
        try:
            name, raw = row.split("=")
            values[name] = int(raw)
        except ValueError:
            rejected.append(row)
    return {"values": values, "rejected": rejected}`,
    testCases: [
      {
        input: { rows: ["cpu=80", "mem=70"] },
        expected: { values: { cpu: 80, mem: 70 }, rejected: [] },
        description: "every row parses",
      },
      {
        input: { rows: ["cpu=80", "mem=high", "disk=90"] },
        expected: { values: { cpu: 80, disk: 90 }, rejected: ["mem=high"] },
        description: "a value that is not an integer",
      },
      {
        input: { rows: ["broken", "a=1=2", "ok=5"] },
        expected: { values: { ok: 5 }, rejected: ["broken", "a=1=2"] },
        description: "rows with the wrong number of equals signs",
      },
      {
        input: { rows: [] },
        expected: { values: {}, rejected: [] },
        description: "no rows at all",
      },
    ],
  },
  practice: {
    id: "py-l5-failure-signatures-practice",
    executionMode: "single-file",
    prompt: `Your team pipes support-ticket text into an analytics tool, and a \`redact\` function is
supposed to strip API keys out first. An assistant wrote the version in the starter. Nobody has
reported a problem, which is itself worrying, so you are checking it against a set of recorded
tickets before the next release.

Write a function \`first_leaking_case(cases)\` that returns the index of the first case in which
\`redact\` disagrees with its contract, or \`-1\` if it handles all of them.

Each case is a two-element list \`[text, secrets]\`. The contract: \`redact(text, secrets)\` returns
\`text\` with every string in \`secrets\` replaced by \`"[REDACTED]"\`. Note that a case whose secret
never appears in the text is handled correctly, so it is not a leak. Keep \`first_leaking_case\` as
the last function in the file.`,
    starterCode: `def redact(text, secrets):
    # Generated code under review. Leave it exactly as it is.
    for secret in secrets:
        text.replace(secret, "[REDACTED]")
    return text


def first_leaking_case(cases):
    # Each case is [text, secrets]. Return the index of the first one redact gets wrong.
    pass`,
    hints: [
      "Write your own correct version first. The only difference is one assignment.",
      "Unpack each case with `text, secrets = case` before you call anything.",
      "A secret that does not occur in the text leaves the string unchanged either way, so that case passes.",
    ],
    referenceSolution: `def redact(text, secrets):
    for secret in secrets:
        text.replace(secret, "[REDACTED]")
    return text


def correct_redact(text, secrets):
    for secret in secrets:
        text = text.replace(secret, "[REDACTED]")
    return text


def first_leaking_case(cases):
    for index, case in enumerate(cases):
        text, secrets = case
        if redact(text, secrets) != correct_redact(text, secrets):
            return index
    return -1`,
    testCases: [
      {
        input: {
          cases: [
            ["hello", ["zzz"]],
            ["token abc", ["abc"]],
          ],
        },
        expected: 1,
        description: "the first secret never appears, the second does",
      },
      {
        input: {
          cases: [
            ["nothing to hide", []],
            ["clean text", ["nope"]],
          ],
        },
        expected: -1,
        description: "no case actually contains a secret",
      },
      {
        input: { cases: [["key=SECRET", ["SECRET"]]] },
        expected: 0,
        description: "the very first ticket leaks",
      },
      {
        input: {
          cases: [
            ["a", ["b"]],
            ["c", ["d"]],
            ["e f", ["f"]],
          ],
        },
        expected: 2,
        description: "two harmless cases before the leak",
      },
    ],
  },
}

// ───────────────────────────────────────────────────────────────────────────
// L5-M2: The Test Is the Verification
// ───────────────────────────────────────────────────────────────────────────

const failingTestLesson: PythonLesson = {
  id: "py-l5-failing-test",
  title: "Write the test that catches the bug",
  summary:
    "A suspicion is not a bug. The assertion that fails before the fix and passes after it is the only durable artifact of a review.",
  estimatedMinutes: 24,
  difficulty: "medium",
  skills: ["test design", "assertions", "code review", "regression tests"],
  teach: {
    estimatedMinutes: 10,
    markdown: `## The only review comment that cannot be argued with

"I think this breaks on empty input" starts a conversation. "\`summarize([])\` raises IndexError, here is the line" ends one. The difference is not tone, it is that the second is a fact anyone can reproduce in five seconds.

A test is that fact, written down so it keeps being checked. Everything else in a review evaporates the moment the branch merges.

A useful test has exactly two properties:

1. It **fails** against the current code.
2. It **passes** against code that satisfies the contract.

A test that passes both before and after the fix proves nothing about the fix. That sounds obvious and it is the single most common flaw in tests written under time pressure, because the natural instinct is to test the behavior you understand, which is the behavior that already works.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "test-must-fail-first",
  "prompt": "You suspect that def busiest_hour(counts): return counts.index(max(counts)) mishandles ties. Which assertion is worth adding?",
  "options": [
    {
      "label": "assert busiest_hour([1, 5, 2]) == 1",
      "feedback": "It documents the ordinary case, which is genuinely worth having in a suite. It cannot tell you anything about ties, because there is no tie in this input."
    },
    {
      "label": "assert busiest_hour([5, 5, 2]) == 0",
      "correct": true,
      "feedback": "Right. This is the smallest input that contains a tie, so it forces the code to reveal which of the tied positions it reports and pins that decision down."
    },
    {
      "label": "assert busiest_hour([]) is None",
      "feedback": "A real boundary and worth a separate test, but it is about emptiness rather than ties. Mixing the two concerns into one investigation is how bugs get half-diagnosed."
    },
    {
      "label": "assert isinstance(busiest_hour([1, 5, 2]), int)",
      "feedback": "Type assertions look rigorous and almost never fail, because the wrong answer is usually the right type. This one passes whether the tie handling is correct or not."
    }
  ]
}
\`\`\`

## Arrange, act, assert

Every test has the same three parts, and keeping them visually separate is what makes a failing test readable at 2am.

\`\`\`python
def test_blank_ratings_do_not_crash():
    scores = [4, None, 5]                 # arrange: the input, built here, not shared
    summary = summarize_ratings(scores)   # act: exactly one call
    assert summary["count"] == 2          # assert: one claim per line
    assert summary["average"] == 4.5
\`\`\`

Three rules earn their keep.

**Build the input inside the test.** A fixture shared between tests is a dependency between tests: if the function under review mutates its argument, test three fails because of what test one did, and you spend an hour on the wrong function.

**One call in the act.** If two calls are needed to reproduce, the second one belongs to a different test, or the pair is itself the thing being tested and should say so.

**Name the test after the claim.** \`test_blank_ratings_do_not_crash\` tells you what broke from the failure line alone. \`test_summarize_2\` tells you to go read it.

## Probing a function you cannot see inside

In a review you often have several candidate implementations and no time to read all of them carefully. A probe treats each one as a black box: call it on inputs derived from the contract, compare against the answer the contract demands, and report a verdict.

\`\`\`python
def check(fn):
    cases = [
        ("abcdefghi12", True),    # happy path: eleven characters, digit, letter
        ("abcdefgh12", True),     # exactly ten: the boundary the rule names
        ("abcdefg 12", False),    # ten characters but one of them is a space
        ("abcdefghij", False),    # no digit
        ("1234567890", False),    # no letter
    ]
    return all(fn(text) is expected for text, expected in cases)
\`\`\`

Read the comments rather than the code. Each case exists because a specific misreading of the contract would pass every other case. That is the design method: for each rule in the contract, write the input that only that rule rejects.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "boundary-case-purpose",
  "prompt": "In the probe above, what does the case ('abcdefgh12', True) exist to catch?",
  "options": [
    {
      "label": "An implementation that forgets to check for digits",
      "feedback": "That job belongs to 'abcdefghij', which has letters and no digit. This case contains a digit, so an implementation missing the digit rule still passes it."
    },
    {
      "label": "An implementation that wrote len(text) > 10 instead of len(text) >= 10",
      "correct": true,
      "feedback": "Right. Ten characters is exactly the threshold the rule names, so it is the only length that separates the two comparisons. Eleven characters passes under both."
    },
    {
      "label": "An implementation that allows spaces",
      "feedback": "There is no space in this string, so a permissive implementation passes it happily. The case with the space in the middle is the one doing that work."
    },
    {
      "label": "An implementation that returns a truthy value instead of True",
      "feedback": "The probe does use is rather than ==, which would catch that, but any of the five cases would. This case was chosen for its length rather than its return type."
    }
  ]
}
\`\`\`

## Some contracts are about what did not happen

Not every rule is visible in the return value. "Do not modify the caller's data" is a promise about the world after the call, and the only way to check it is to look.

\`\`\`python
def check(fn):
    defaults = {"theme": "light", "rows": 20}
    overrides = {"rows": 50}

    result = fn(defaults, overrides)

    if result != {"theme": "light", "rows": 50}:
        return False
    if defaults != {"theme": "light", "rows": 20}:   # the caller's dict must survive
        return False
    return True
\`\`\`

An implementation that writes \`defaults.update(overrides)\` and returns \`defaults\` produces a perfectly correct return value. It also silently rewrites the caller's configuration, and every later read of \`defaults\` in that process sees the merged version. Only the second assertion finds it.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "probe-hygiene-shared-input",
  "prompt": "A probe builds its input dict once at module level and reuses it across four candidates. Candidate two mutates its argument. What happens?",
  "options": [
    {
      "label": "Candidates three and four are judged against corrupted input",
      "correct": true,
      "feedback": "Right. The mutation persists in the shared dict, so every later candidate is measured against data the previous one rewrote, and the verdicts after the second are meaningless."
    },
    {
      "label": "Nothing, because Python passes dictionaries by value",
      "feedback": "A very common belief and the source of this whole bug class. Python passes a reference to the same object, so a mutation inside the function is visible to the caller."
    },
    {
      "label": "Candidate two is correctly reported as broken and the rest are unaffected",
      "feedback": "You would like this to be true and it is exactly half true: candidate two does get caught. The damage to the shared dict outlives the call and taints everything after it."
    },
    {
      "label": "Python raises a RuntimeError for mutating a shared structure",
      "feedback": "Python only raises for mutating a collection while iterating over it, which is a different situation. A plain update on a shared dict is legal and silent."
    }
  ]
}
\`\`\`

## The test outlives the review

Once a bug is found, the assertion that found it goes into the suite permanently. That is what a regression test is: not a new idea, just the failing test kept after the fix landed, so the same mistake cannot return in six months when someone rewrites the function for unrelated reasons.

**Interview nuance:** when you find a bug in a pairing exercise, the strongest thing you can do is write the failing assertion before you write the fix. It proves the diagnosis is real, it gives you an unambiguous definition of done, and it is exactly the loop a professional works in. Saying "let me pin this with a test first" reads as senior in a way that no amount of fluent typing does.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "failing-test-cumulative",
  "prompt": "You have found and fixed a bug in someone else's function. What do you do with the input that exposed it?",
  "options": [
    {
      "label": "Mention it in the pull request description so reviewers know it was considered",
      "feedback": "Useful context and better than nothing, but a description is not executed by anything. The next rewrite of that function has no way to know the case mattered."
    },
    {
      "label": "Keep it as an assertion in the test suite, named after the claim it makes",
      "correct": true,
      "feedback": "Right. The failing test is the durable artifact of the whole review: it proved the bug, it defined done, and kept in the suite it prevents the same mistake returning."
    },
    {
      "label": "Delete it, since the code now passes and a passing test adds no information",
      "feedback": "Tempting because a green test does feel redundant on the day you write it. Its value is entirely in the future, the day someone changes the function and it turns red."
    },
    {
      "label": "Replace it with a broader test covering the whole function",
      "feedback": "Broader coverage is worth having in general, so this instinct is not wrong. A broad test that happens to exercise the case is much harder to interpret when it fails than one written for it."
    }
  ],
  "reveal": "A review produces two things worth keeping: the fix, and the assertion that proved it was needed. Only one of them survives the next rewrite."
}
\`\`\``,
    demoCode: `def merge_settings(defaults, overrides):
    defaults.update(overrides)      # returns the right value, wrecks the caller's dict
    return defaults


base = {"theme": "light", "rows": 20}
print(merge_settings(base, {"rows": 50}))   # {'theme': 'light', 'rows': 50}
print(base)                                 # {'theme': 'light', 'rows': 50} <- mutated`,
  },
  apply: {
    id: "py-l5-failing-test-apply",
    executionMode: "single-file",
    prompt: `Write a function \`check(name)\` that returns \`True\` only when the candidate stored under
\`name\` is a correct \`is_strong_password\`, and \`False\` otherwise.

The contract: \`is_strong_password(text)\` returns \`True\` when \`text\` is **at least** 10 characters
long, contains at least one digit, contains at least one letter, and contains no space character.
Otherwise it returns \`False\`.

The starter holds four candidates in \`CANDIDATES\`. Two of them are correct. Each rule in the
contract needs its own probe case, including one input that sits exactly on the length threshold.
Keep \`check\` as the last function in the file.`,
    starterCode: `def a(text):
    return (
        len(text) > 10
        and any(c.isdigit() for c in text)
        and any(c.isalpha() for c in text)
        and " " not in text
    )


def b(text):
    return (
        len(text) >= 10
        and any(c.isdigit() for c in text)
        and any(c.isalpha() for c in text)
        and " " not in text
    )


def c(text):
    return (
        len(text) >= 10
        and any(ch.isdigit() for ch in text)
        and any(ch.isalpha() for ch in text)
    )


def d(text):
    if len(text) < 10:
        return False
    has_digit = False
    has_letter = False
    for ch in text:
        if ch == " ":
            return False
        if ch.isdigit():
            has_digit = True
        elif ch.isalpha():
            has_letter = True
    return has_digit and has_letter


CANDIDATES = {"a": a, "b": b, "c": c, "d": d}


def check(name):
    # Probe CANDIDATES[name] and return True only if it satisfies the contract.
    pass`,
    hints: [
      "Build a list of `(text, expected)` pairs, one per rule in the contract, then call the candidate on each.",
      "A password of exactly 10 characters separates `len(text) > 10` from `len(text) >= 10`.",
      "A 10-character string containing a space, a digit and a letter separates the candidate that forgot the space rule.",
    ],
    referenceSolution: `def a(text):
    return (
        len(text) > 10
        and any(c.isdigit() for c in text)
        and any(c.isalpha() for c in text)
        and " " not in text
    )


def b(text):
    return (
        len(text) >= 10
        and any(c.isdigit() for c in text)
        and any(c.isalpha() for c in text)
        and " " not in text
    )


def c(text):
    return (
        len(text) >= 10
        and any(ch.isdigit() for ch in text)
        and any(ch.isalpha() for ch in text)
    )


def d(text):
    if len(text) < 10:
        return False
    has_digit = False
    has_letter = False
    for ch in text:
        if ch == " ":
            return False
        if ch.isdigit():
            has_digit = True
        elif ch.isalpha():
            has_letter = True
    return has_digit and has_letter


CANDIDATES = {"a": a, "b": b, "c": c, "d": d}


def check(name):
    fn = CANDIDATES[name]
    cases = [
        ("abcdefghi12", True),
        ("abcdefgh12", True),
        ("abcdefg 12", False),
        ("abcdefghij", False),
        ("1234567890", False),
        ("abc12", False),
    ]
    for text, expected in cases:
        if fn(text) != expected:
            return False
    return True`,
    testCases: [
      { input: { name: "a" }, expected: false, description: "candidate a" },
      { input: { name: "b" }, expected: true, description: "candidate b" },
      { input: { name: "c" }, expected: false, description: "candidate c" },
      { input: { name: "d" }, expected: true, description: "candidate d" },
    ],
  },
  practice: {
    id: "py-l5-failing-test-practice",
    executionMode: "single-file",
    prompt: `Your app loads a dictionary of default settings once at start-up and merges each user's
saved preferences on top of it. Four implementations of that merge are sitting in an open pull
request, all of them produce the right settings screen in a manual test, and one reviewer has
noticed that a user who changes their row count seems to change it for everyone.

Write a function \`check(name)\` that returns \`True\` only when the candidate stored under \`name\` is a
correct \`merge_settings\`, and \`False\` otherwise.

The contract: \`merge_settings(defaults, overrides)\` returns a **new** dictionary holding every key
from both, with the value from \`overrides\` winning wherever a key appears in both. Neither argument
may be modified. Build fresh input dictionaries inside \`check\`, and keep \`check\` as the last
function in the file.`,
    starterCode: `def a(defaults, overrides):
    merged = dict(defaults)
    merged.update(overrides)
    return merged


def b(defaults, overrides):
    defaults.update(overrides)
    return defaults


def c(defaults, overrides):
    return {**defaults, **overrides}


def d(defaults, overrides):
    merged = dict(overrides)
    merged.update(defaults)
    return merged


CANDIDATES = {"a": a, "b": b, "c": c, "d": d}


def check(name):
    # Probe CANDIDATES[name] and return True only if it satisfies the contract.
    pass`,
    hints: [
      "Give the candidate a key that appears in both dictionaries, so you can see which side wins.",
      "After the call, compare `defaults` against the value you built it with. That is the only way to see a mutation.",
      "Build the dictionaries inside `check` so one candidate's mutation cannot reach the next call.",
    ],
    referenceSolution: `def a(defaults, overrides):
    merged = dict(defaults)
    merged.update(overrides)
    return merged


def b(defaults, overrides):
    defaults.update(overrides)
    return defaults


def c(defaults, overrides):
    return {**defaults, **overrides}


def d(defaults, overrides):
    merged = dict(overrides)
    merged.update(defaults)
    return merged


CANDIDATES = {"a": a, "b": b, "c": c, "d": d}


def check(name):
    fn = CANDIDATES[name]
    defaults = {"theme": "light", "rows": 20}
    overrides = {"rows": 50, "font": "mono"}

    result = fn(defaults, overrides)

    if result != {"theme": "light", "rows": 50, "font": "mono"}:
        return False
    if defaults != {"theme": "light", "rows": 20}:
        return False
    if overrides != {"rows": 50, "font": "mono"}:
        return False
    return True`,
    testCases: [
      { input: { name: "a" }, expected: true, description: "candidate a" },
      { input: { name: "b" }, expected: false, description: "candidate b" },
      { input: { name: "c" }, expected: true, description: "candidate c" },
      { input: { name: "d" }, expected: false, description: "candidate d" },
    ],
  },
}

const propertiesLesson: PythonLesson = {
  id: "py-l5-properties",
  title: "Properties catch what examples miss",
  summary:
    "When you run out of examples, assert a property that must hold for every input and search for the smallest input that violates it.",
  estimatedMinutes: 24,
  difficulty: "medium",
  skills: ["property testing", "invariants", "test design", "verification"],
  teach: {
    estimatedMinutes: 10,
    markdown: `## The limit of examples

An example test says "this input gives that output". It is precise, it is easy to read, and it covers exactly one point in an infinite space. You can write twenty of them and still miss the case that matters, because you chose all twenty and you chose them from the same mental model that wrote the code.

A **property** is a claim that holds for every valid input. You do not have to guess which input breaks it. You write the claim once and let a loop go looking.

Four kinds cover most of what you will need.

### Round trip

Encoding then decoding must give back what you started with.

\`\`\`python
for n in range(1, 200):
    original = "a" * n
    assert decode(encode(original)) == original
\`\`\`

### Invariant

Something must be true of the output no matter what went in. Splitting a bill preserves the total. Sorting preserves the multiset of elements. A discount never produces a negative price.

\`\`\`python
parts = split_evenly(total, count)
assert sum(parts) == total                  # nothing was created or lost
assert max(parts) - min(parts) <= 1         # the split is actually even
\`\`\`

### Idempotence

Applying it twice is the same as applying it once. True of normalizing, trimming, deduplicating, and most "clean this up" functions, and very often false in the implementation.

\`\`\`python
assert normalize(normalize(text)) == normalize(text)
\`\`\`

### Agreement with something obviously correct

A slow, dull, clearly-right implementation is a specification you can execute. The fast one must agree with it on every input.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "rle-round-trip-break",
  "prompt": "Run-length encoding turns 'aaab' into 'a3b1', and the decoder walks the code two characters at a time reading a letter then a count. What is the smallest run of one repeated letter that breaks the round trip?",
  "options": [
    {
      "label": "1, because a single character has no run to compress",
      "feedback": "A run of one encodes as 'a1', which is two characters and decodes back to 'a' correctly. Compression making the string longer is wasteful, not wrong."
    },
    {
      "label": "9, the last single-digit count",
      "feedback": "Very close to the real boundary and one short of it. A run of nine still encodes as two characters, 'a9', so the two-at-a-time walk reads it correctly."
    },
    {
      "label": "10, the first count that needs two digits",
      "correct": true,
      "feedback": "Right. 'a10' is three characters, so a decoder stepping in pairs reads 'a' and '1' as the first pair and then runs off the end of the string looking for a partner for '0'."
    },
    {
      "label": "26, once the counts exceed the alphabet",
      "feedback": "The alphabet size has nothing to do with the format, so this is a false lead. What matters is the number of characters the count occupies in the encoded string."
    }
  ]
}
\`\`\`

## Searching for the smallest violation

Once you have a property, finding a counterexample is a loop. Start small and stop at the first failure, because the smallest failing input is the easiest one to reason about.

\`\`\`python
def first_round_trip_failure(limit):
    for n in range(1, limit + 1):
        original = "a" * n
        try:
            if decode(encode(original)) != original:
                return n
        except Exception:
            return n            # a crash is a violation too
    return -1
\`\`\`

The \`try\` matters. A property can be violated by a wrong answer or by an exception, and a search that only handles the first stops at the second. This is one of the few places where catching \`Exception\` broadly is right: inside a probe you genuinely do want every failure mode to count as a failure, and the exception is being converted into a verdict rather than discarded.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "property-or-restatement",
  "prompt": "You are reviewing split_evenly(total, parts), which should return as many whole numbers as parts asks for, summing to total, differing by at most 1. Sort each assertion by whether it is a property worth checking or a restatement of the implementation.",
  "buckets": ["A property worth asserting", "A restatement of the implementation"],
  "items": [
    {
      "label": "sum(result) == total",
      "bucket": "A property worth asserting",
      "feedback": "This comes from the contract and is independent of how the split is computed, so any implementation that loses a unit fails it."
    },
    {
      "label": "result[0] == total // parts + total % parts",
      "bucket": "A restatement of the implementation",
      "feedback": "This copies the formula out of the body, so it passes whatever that body does, including piling the whole remainder onto one element."
    },
    {
      "label": "max(result) - min(result) <= 1",
      "bucket": "A property worth asserting",
      "feedback": "This is the word evenly, written as something executable. It is the assertion that catches a remainder dumped onto a single part."
    },
    {
      "label": "len(result) == parts",
      "bucket": "A property worth asserting",
      "feedback": "Small, cheap, and derived from the contract rather than the code. It catches an off-by-one in whatever builds the list."
    },
    {
      "label": "all(x == result[0] for x in result[1:])",
      "bucket": "A restatement of the implementation",
      "feedback": "It describes one particular implementation, where every element after the first is the base value. A correct split that spreads the remainder fails this assertion."
    }
  ]
}
\`\`\`

## Where properties come from

You do not invent them. You read the contract and translate each promise into something executable.

| The contract says | The property is |
| --- | --- |
| "splits the total between them" | \`sum(parts) == total\` |
| "evenly" | \`max(parts) - min(parts) <= 1\` |
| "returns a sorted copy" | \`sorted(result) == result\` and \`sorted(original) == result\` |
| "removes duplicates" | \`len(set(result)) == len(result)\` |
| "never charges more than the cap" | \`result <= cap\` |
| "cleans up the input" | \`clean(clean(x)) == clean(x)\` |

If a promise in the contract has no executable form, that is worth noticing on its own: it usually means the requirement is not yet specific enough to build against, and asking the question is a more valuable review comment than any test.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "property-vs-example-budget",
  "prompt": "A generated sort_by_priority passes all six of your example tests. You have time for one more check. Which is worth the most?",
  "options": [
    {
      "label": "A seventh example with realistic production data",
      "feedback": "Realistic data is reassuring and mostly ordinary, so a seventh example is very likely to pass alongside the other six. It adds confidence rather than information."
    },
    {
      "label": "A property loop asserting the result is a permutation of the input across many random lists",
      "correct": true,
      "feedback": "Right. It checks something no single example can: that nothing was dropped or duplicated, across inputs you did not choose and therefore did not bias."
    },
    {
      "label": "A timing measurement to confirm it is fast enough",
      "feedback": "Cost is a real review dimension and deserves attention on hot paths. It answers a different question though, and a fast function that silently drops elements is still broken."
    },
    {
      "label": "A test that the function does not print anything",
      "feedback": "Stray debug output is a genuine annoyance in a shared codebase and cheap to check. It is nowhere near the value of confirming that no data goes missing."
    }
  ]
}
\`\`\`

**Interview nuance:** in a pairing interview, "what property should always hold here?" is a question you can ask about any function on the screen, and it moves the conversation from typing to specification instantly. For a sort it is "the output is a permutation of the input". For a cache it is "a hit returns exactly what was written". Interviewers notice, because most candidates only ever discuss examples.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "properties-cumulative",
  "prompt": "Your property loop over inputs 1 through 500 reports the first violation at 10. What do you do next?",
  "options": [
    {
      "label": "Widen the search to 5000 in case there are worse violations further out",
      "feedback": "There may well be more failures out there, and none of them are more informative than the first. A bigger search costs time and gives you a longer list of the same bug."
    },
    {
      "label": "Look at what is special about 10 and turn it into a named example test",
      "correct": true,
      "feedback": "Right. The smallest counterexample is the diagnosis: 10 is the first count that needs two digits. Pinning it as a named test keeps the finding after the search is deleted."
    },
    {
      "label": "Fix the code until the loop passes, then remove the loop",
      "feedback": "The first half is exactly right and the second half throws away the evidence. Without a kept assertion, the next rewrite of the decoder can reintroduce the same bug unnoticed."
    },
    {
      "label": "Report that the function fails on 491 of 500 inputs",
      "feedback": "Technically accurate and much harder to act on than one input. A single minimal counterexample points at a line, while a large failure count only measures how far the bug spreads."
    }
  ],
  "reveal": "Examples check the points you thought of. Properties check the space you did not. Search finds the smallest violation, and the smallest violation is usually the explanation."
}
\`\`\``,
    demoCode: `def encode(text):
    if not text:
        return ""
    out = []
    current = text[0]
    count = 1
    for ch in text[1:]:
        if ch == current:
            count += 1
        else:
            out.append(current + str(count))
            current = ch
            count = 1
    out.append(current + str(count))
    return "".join(out)


print(encode("a" * 9))    # a9,  two characters
print(encode("a" * 10))   # a10, three characters and the pair-wise decoder breaks`,
  },
  apply: {
    id: "py-l5-properties-apply",
    executionMode: "single-file",
    prompt: `Write a function \`first_round_trip_failure(limit)\` that returns the smallest run length
\`n\` between \`1\` and \`limit\` for which \`decode(encode("a" * n))\` does not give back \`"a" * n\`, or
\`-1\` when every length in that range round-trips correctly.

The property: for any text, \`decode(encode(text))\` must equal \`text\`. Both functions are in the
starter and neither should be changed.

A violation can be a wrong answer **or** an exception, so your search has to survive both. Keep
\`first_round_trip_failure\` as the last function in the file.`,
    starterCode: `def encode(text):
    # Generated code under review. Leave it exactly as it is.
    if not text:
        return ""
    out = []
    current = text[0]
    count = 1
    for ch in text[1:]:
        if ch == current:
            count += 1
        else:
            out.append(current + str(count))
            current = ch
            count = 1
    out.append(current + str(count))
    return "".join(out)


def decode(code):
    # Generated code under review. Leave it exactly as it is.
    out = []
    for i in range(0, len(code), 2):
        out.append(code[i] * int(code[i + 1]))
    return "".join(out)


def first_round_trip_failure(limit):
    # Return the smallest n in 1..limit that breaks the round trip, or -1.
    pass`,
    hints: [
      "Loop `n` from 1 to `limit` and compare `decode(encode('a' * n))` against `'a' * n`.",
      "Wrap the round trip in `try` / `except Exception` and return `n` from the except block: a crash is a violation.",
      "Encode a run of 9 and a run of 10 by hand and count the characters in each result.",
    ],
    referenceSolution: `def encode(text):
    if not text:
        return ""
    out = []
    current = text[0]
    count = 1
    for ch in text[1:]:
        if ch == current:
            count += 1
        else:
            out.append(current + str(count))
            current = ch
            count = 1
    out.append(current + str(count))
    return "".join(out)


def decode(code):
    out = []
    for i in range(0, len(code), 2):
        out.append(code[i] * int(code[i + 1]))
    return "".join(out)


def first_round_trip_failure(limit):
    for n in range(1, limit + 1):
        original = "a" * n
        try:
            if decode(encode(original)) != original:
                return n
        except Exception:
            return n
    return -1`,
    testCases: [
      { input: { limit: 20 }, expected: 10, description: "a range wide enough to reach the bug" },
      { input: { limit: 5 }, expected: -1, description: "short runs all round-trip" },
      { input: { limit: 9 }, expected: -1, description: "the last length before the boundary" },
      {
        input: { limit: 100 },
        expected: 10,
        description: "a much wider range finds the same first failure",
      },
    ],
  },
  practice: {
    id: "py-l5-properties-practice",
    executionMode: "single-file",
    prompt: `Your product splits a group order between the people at the table, and an assistant wrote
the \`split_evenly\` function in the starter. The bill always adds up, so accounting is happy, but
customers on large tables have started complaining that one person is charged noticeably more than
everyone else.

Write a function \`first_uneven_total(parts, start)\` that returns the smallest \`total\` between
\`start\` and \`start + 100\` inclusive for which \`split_evenly\` violates one of its two properties, or
\`-1\` if none of those totals do.

The two properties: the returned numbers must sum to \`total\`, and the largest must exceed the
smallest by at most 1. Check both. Keep \`first_uneven_total\` as the last function in the file.`,
    starterCode: `def split_evenly(total, parts):
    # Generated code under review. Leave it exactly as it is.
    base = total // parts
    result = [base] * parts
    result[0] += total % parts
    return result


def first_uneven_total(parts, start):
    # Return the smallest total in start..start+100 that breaks a property, or -1.
    pass`,
    hints: [
      "Loop `total` over `range(start, start + 101)` and call `split_evenly(total, parts)` for each.",
      "Assert both properties: `sum(result) == total`, and `max(result) - min(result) <= 1`.",
      "One of the two properties holds for every input here. Finding which one is the point of checking both.",
    ],
    referenceSolution: `def split_evenly(total, parts):
    base = total // parts
    result = [base] * parts
    result[0] += total % parts
    return result


def first_uneven_total(parts, start):
    for total in range(start, start + 101):
        result = split_evenly(total, parts)
        if sum(result) != total:
            return total
        if max(result) - min(result) > 1:
            return total
    return -1`,
    testCases: [
      { input: { parts: 5, start: 10 }, expected: 12, description: "a table of five" },
      {
        input: { parts: 2, start: 1 },
        expected: -1,
        description: "a table of two never splits unevenly",
      },
      {
        input: { parts: 4, start: 100 },
        expected: 102,
        description: "a large bill on a table of four",
      },
      { input: { parts: 3, start: 7 }, expected: 8, description: "a table of three" },
    ],
  },
}

const oracleLesson: PythonLesson = {
  id: "py-l5-oracle",
  title: "Check it against a version that is obviously correct",
  summary:
    "Write the slow, dull, clearly-right implementation and make the clever one agree with it. A brute force you trust is a specification you can execute.",
  estimatedMinutes: 24,
  difficulty: "medium",
  skills: ["differential testing", "brute force", "code review", "verification"],
  teach: {
    estimatedMinutes: 9,
    markdown: `## When you cannot tell by reading

Some code is optimized past the point where reading it settles the question. A single pass with a dictionary replaces a double loop, and now correctness depends on an argument about what the dictionary holds at each step. You can follow that argument, and you can also be wrong about it, confidently, in about forty seconds.

There is a way out that costs almost nothing. Write the version that is too slow to ship and too simple to be wrong, then make the fast one agree with it on every input you can generate.

\`\`\`python
def count_pairs_slow(nums, target):
    """Every pair, checked directly. Quadratic and obviously right."""
    total = 0
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                total += 1
    return total
\`\`\`

Nobody ships this. But as a **reference oracle** it is worth more than the clever version, because you can verify it by reading it once, and then it verifies everything else for free.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "oracle-purpose",
  "prompt": "Your quadratic reference and the generated single-pass version disagree on one input. What have you learned?",
  "options": [
    {
      "label": "The fast version has a bug",
      "feedback": "The most likely explanation and still an assumption. Disagreement is symmetric: it says one of the two is wrong on this input, and the reference is only more trustworthy because it is simpler."
    },
    {
      "label": "That exactly one of them is wrong here, and you now have the input to work it out",
      "correct": true,
      "feedback": "Right. The value of a disagreement is the concrete input attached to it. You hand-check that one input against the contract and the question is settled in a minute."
    },
    {
      "label": "Nothing, since two implementations can both be valid",
      "feedback": "True for genuinely underspecified behavior such as tie ordering, which is worth ruling out first. For a counting function there is one right answer, so a disagreement is a real finding."
    },
    {
      "label": "That the contract is ambiguous and needs rewriting",
      "feedback": "Sometimes the correct conclusion, and worth reaching for when both answers look defensible. Jumping there first skips the cheap step of checking the input by hand."
    }
  ]
}
\`\`\`

## The differential loop

Generate inputs, run both, compare, stop at the first disagreement.

\`\`\`python
def first_disagreeing_target(nums, targets):
    for target in targets:
        if count_pairs_fast(nums, target) != count_pairs_slow(nums, target):
            return target
    return -1
\`\`\`

That is the whole technique. Its power comes from where the inputs come from: you no longer have to be clever about choosing them, because you are not predicting the answer, only comparing two answers. So you can throw thousands of ugly inputs at it, including inputs you would never have thought to write down.

The inputs that find bugs fastest are the ones with structure a human would not bother typing: lots of duplicates, all the same value, everything negative, one element, empty.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "duplicate-blind-set",
  "prompt": "A single-pass version tracks values it has seen in a set: for n in nums, if target - n in seen: total += 1, then seen.add(n). With nums = [1, 1, 1] and target = 2, what does it return, and what is right?",
  "options": [
    {
      "label": "It returns 3, which is correct",
      "feedback": "Three is the right answer, since positions (0,1), (0,2) and (1,2) all sum to 2. A set cannot produce it, because it has no way to know that the value 1 arrived more than once."
    },
    {
      "label": "It returns 2, and the answer is 3",
      "correct": true,
      "feedback": "Right. The set records that 1 was seen, not how often, so each later 1 contributes one pair instead of one per earlier copy. A Counter is what this code needed."
    },
    {
      "label": "It returns 1, and the answer is 3",
      "feedback": "Close reading of the undercount, but off by one iteration. The first element adds nothing, and both the second and third find 1 already in the set, so the total reaches 2."
    },
    {
      "label": "It returns 3, and the answer is 1, since the pairs are duplicates",
      "feedback": "Whether repeated values count as distinct pairs is exactly the kind of thing the contract must settle, so the question is fair. For pairs identified by index, all three count."
    }
  ]
}
\`\`\`

## When the oracle is the shipped code

Differential testing is not only for speed. It is the fastest way to review a rewrite, a refactor, or a migration, because you already have a version everyone trusts: the one in production.

\`\`\`python
for row in sample_rows:
    assert new_pricing(row) == old_pricing(row)
\`\`\`

Every disagreement is either a bug in the new code or an undocumented behavior of the old code that somebody depends on. Both are things you want to find before the deploy rather than after.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "oracle-is-available",
  "prompt": "Sort each review situation by whether a reference oracle is available to you cheaply.",
  "buckets": ["An oracle is right there", "You would have to invent the answer"],
  "items": [
    {
      "label": "A single-pass rewrite of a function that used to use two nested loops",
      "bucket": "An oracle is right there",
      "feedback": "The nested-loop version is in the git history, so you can paste it back in as the reference and compare on thousands of inputs."
    },
    {
      "label": "A new pricing rule that has never existed before",
      "bucket": "You would have to invent the answer",
      "feedback": "There is nothing to compare against, so verification has to come from the contract itself through examples and properties."
    },
    {
      "label": "A caching layer added in front of an existing lookup",
      "bucket": "An oracle is right there",
      "feedback": "The uncached lookup is the oracle: for every key, the cached result must equal what the underlying lookup returns."
    },
    {
      "label": "A generated regex replacing a hand-written parser",
      "bucket": "An oracle is right there",
      "feedback": "The old parser answers the same question, so you can run both over a corpus of real strings and inspect every disagreement."
    },
    {
      "label": "A first implementation of a recommendation ranking",
      "bucket": "You would have to invent the answer",
      "feedback": "There is no prior behavior and often no single right answer, so properties and human judgment carry the whole review."
    }
  ]
}
\`\`\`

## The two ways this goes wrong

**The oracle is wrong too.** If you write the reference from the same misunderstanding of the contract, both versions agree and both are wrong. Guard against it by making the reference dumb enough that its correctness is visible in one reading, and by keeping a couple of hand-checked examples alongside.

**Nothing generates interesting inputs.** A differential loop over ten hand-picked ordinary inputs finds nothing that ten ordinary example tests would not. The inputs have to include the shapes you find uncomfortable.

**Interview nuance:** offering to write the brute force first is a strong move in an interview, not a weak one. "Let me get the obviously correct version down so I have something to check the optimized one against" shows you know that the optimization is the risky part. Plenty of candidates jump straight to the clever solution and then cannot tell whether it works.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "oracle-cumulative",
  "prompt": "You have a trusted quadratic reference and a generated linear version. You run 10000 random lists of length 5 through both and find no disagreement. What is the honest conclusion?",
  "options": [
    {
      "label": "The linear version is correct",
      "feedback": "Stronger than the evidence supports. Ten thousand samples of one shape can only speak for that shape, and plenty of bugs need a longer list or a specific structure to appear."
    },
    {
      "label": "The two agree on short random lists, and you have not yet tried the awkward shapes",
      "correct": true,
      "feedback": "Right. Random short lists rarely contain heavy duplication, all-equal values, or emptiness, which is where this class of bug lives. Name what you covered and what you did not."
    },
    {
      "label": "The reference must be wrong, since a real bug would have shown up",
      "feedback": "A useful suspicion in general, because a broken oracle does produce suspiciously clean runs. Here the simpler explanation is that the generator never produced an interesting input."
    },
    {
      "label": "The test is worthless because it found nothing",
      "feedback": "Too harsh. A clean differential run over a well-chosen input space is real evidence, and it also leaves you a harness you can immediately point at better inputs."
    }
  ],
  "reveal": "Write the version that is too slow to ship and too simple to be wrong, then make the clever one agree with it. Most of the skill is in choosing inputs ugly enough to matter."
}
\`\`\``,
    demoCode: `def count_pairs_slow(nums, target):
    total = 0
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                total += 1
    return total


def count_pairs_fast(nums, target):
    seen = set()
    total = 0
    for n in nums:
        if target - n in seen:
            total += 1
        seen.add(n)
    return total


print(count_pairs_slow([1, 1, 1], 2), count_pairs_fast([1, 1, 1], 2))   # 3 2`,
  },
  apply: {
    id: "py-l5-oracle-apply",
    executionMode: "single-file",
    prompt: `Write a function \`first_disagreeing_target(nums, targets)\` that returns the first value in
\`targets\` for which \`count_pairs_fast(nums, target)\` disagrees with \`count_pairs_slow(nums, target)\`,
or \`-1\` when the two agree on every target in the list.

Both functions are in the starter. \`count_pairs_slow\` is the reference oracle: it checks every pair
directly, so it is slow and correct. \`count_pairs_fast\` is the single-pass version under review.
Neither should be changed. No target in the graded inputs is negative, so \`-1\` is safe as the
"they always agreed" answer.

Keep \`first_disagreeing_target\` as the last function in the file.`,
    starterCode: `def count_pairs_slow(nums, target):
    # The reference oracle: every pair, checked directly.
    total = 0
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                total += 1
    return total


def count_pairs_fast(nums, target):
    # Generated code under review. Leave it exactly as it is.
    seen = set()
    total = 0
    for n in nums:
        if target - n in seen:
            total += 1
        seen.add(n)
    return total


def first_disagreeing_target(nums, targets):
    # Return the first target the two disagree on, or -1.
    pass`,
    hints: [
      "Loop over `targets` and compare the two return values for each one.",
      "Return the target itself, not its index, and return `-1` only after the loop finishes.",
      "Hand-check `nums = [1, 1, 1]` with `target = 2` first: count the pairs by index.",
    ],
    referenceSolution: `def count_pairs_slow(nums, target):
    total = 0
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                total += 1
    return total


def count_pairs_fast(nums, target):
    seen = set()
    total = 0
    for n in nums:
        if target - n in seen:
            total += 1
        seen.add(n)
    return total


def first_disagreeing_target(nums, targets):
    for target in targets:
        if count_pairs_fast(nums, target) != count_pairs_slow(nums, target):
            return target
    return -1`,
    testCases: [
      {
        input: { nums: [1, 1, 1], targets: [5, 2, 3] },
        expected: 2,
        description: "three copies of the same value",
      },
      {
        input: { nums: [1, 2, 3], targets: [4, 5] },
        expected: -1,
        description: "all values distinct, so the two agree",
      },
      {
        input: { nums: [2, 2, 2, 2], targets: [4] },
        expected: 4,
        description: "heavy duplication on the first target",
      },
      {
        input: { nums: [5, 5, 1], targets: [6, 10] },
        expected: 6,
        description: "one repeated value and one unique value",
      },
    ],
  },
  practice: {
    id: "py-l5-oracle-practice",
    executionMode: "single-file",
    prompt: `A leaderboard service needs the top scores for a game, and four implementations are sitting
in a pull request. All four look reasonable, all four return the right answer in the reviewer's
manual test, and the service has started serving a leaderboard that is subtly wrong for some games.

Write a function \`check(name)\` that returns \`True\` only when the candidate stored under \`name\` is a
correct \`top_k\`, and \`False\` otherwise.

The contract: \`top_k(scores, k)\` returns the \`k\` largest scores in descending order, keeping
duplicates. \`k\` may be \`0\`, and it may be larger than the list, in which case every score is
returned. The caller's list must not be modified.

\`sorted(scores, reverse=True)[:k]\` is a correct and obviously right oracle, so use it to produce the
expected value rather than writing expectations by hand. Keep \`check\` as the last function in the
file.`,
    starterCode: `def a(scores, k):
    return sorted(scores)[-k:][::-1]


def b(scores, k):
    return sorted(scores, reverse=True)[:k]


def c(scores, k):
    out = []
    for _ in range(min(k, len(scores))):
        top = max(scores)
        out.append(top)
        scores.remove(top)
    return out


def d(scores, k):
    remaining = list(scores)
    out = []
    for _ in range(min(k, len(remaining))):
        top = max(remaining)
        out.append(top)
        remaining.remove(top)
    return out


CANDIDATES = {"a": a, "b": b, "c": c, "d": d}


def check(name):
    # Probe CANDIDATES[name] against the oracle and return True only if it satisfies the contract.
    pass`,
    hints: [
      "For each case, compare the candidate's result against `sorted(scores, reverse=True)[:k]`.",
      "Include `k = 0` in your cases. A negative slice bound behaves surprisingly when the bound is zero.",
      "Pass a list you still hold a reference to, then compare it against a saved copy to catch a mutation.",
    ],
    referenceSolution: `def a(scores, k):
    return sorted(scores)[-k:][::-1]


def b(scores, k):
    return sorted(scores, reverse=True)[:k]


def c(scores, k):
    out = []
    for _ in range(min(k, len(scores))):
        top = max(scores)
        out.append(top)
        scores.remove(top)
    return out


def d(scores, k):
    remaining = list(scores)
    out = []
    for _ in range(min(k, len(remaining))):
        top = max(remaining)
        out.append(top)
        remaining.remove(top)
    return out


CANDIDATES = {"a": a, "b": b, "c": c, "d": d}


def check(name):
    fn = CANDIDATES[name]
    cases = [
        ([5, 1, 9, 3], 2),
        ([4, 4, 4], 2),
        ([7, 2], 0),
        ([1], 5),
        ([], 3),
    ]
    for scores, k in cases:
        passed_in = list(scores)
        result = fn(passed_in, k)
        if result != sorted(scores, reverse=True)[:k]:
            return False
        if passed_in != list(scores):
            return False
    return True`,
    testCases: [
      { input: { name: "a" }, expected: false, description: "candidate a" },
      { input: { name: "b" }, expected: true, description: "candidate b" },
      { input: { name: "c" }, expected: false, description: "candidate c" },
      { input: { name: "d" }, expected: true, description: "candidate d" },
    ],
  },
}

// ───────────────────────────────────────────────────────────────────────────
// L5-M3: Debugging Code You Did Not Author
// ───────────────────────────────────────────────────────────────────────────

const shrinkLesson: PythonLesson = {
  id: "py-l5-shrink",
  title: "Shrink the failing input",
  summary:
    "A bug report with a 400 row file is not a diagnosis. Cut the input down until removing anything else makes the failure disappear, and the answer is usually visible.",
  estimatedMinutes: 22,
  difficulty: "medium",
  skills: ["debugging", "minimal reproduction", "bisection", "verification"],
  teach: {
    estimatedMinutes: 9,
    markdown: `## "It fails on the production file"

That sentence is where most debugging sessions start and it contains almost no information. The file has forty thousand rows, the failure is somewhere in the interaction between them, and reading the function again for the fourth time is not going to reveal which.

The move is not to read harder. It is to make the input smaller until it is small enough to understand.

**A minimal reproduction is an input that still fails, where removing any part of it makes the failure go away.** Getting there is mechanical, it needs no insight, and it usually hands you the diagnosis for free, because by the end the input has been reduced to precisely the thing that matters.

## Bisect when the input is a sequence

Halve it. Test the half. Whichever half still fails is your new input. Repeat.

\`\`\`python
rows = load("production.csv")        # 40000 rows, fails
first_half = rows[:20000]            # fails    -> keep going here
first_quarter = rows[:10000]         # passes   -> the trigger is in 10000..20000
\`\`\`

Sixteen halvings take forty thousand rows down to one. Sixteen. That is the entire reason this technique is worth learning: the cost is logarithmic in the size of the thing you are afraid of.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "bisect-cost",
  "prompt": "A 40000 row file makes an import crash. Roughly how many runs does halving need to reach a single triggering row?",
  "options": [
    {
      "label": "About 16",
      "correct": true,
      "feedback": "Right. Each run halves what is left, and 2 to the 16th is about 65000, so sixteen runs is enough to isolate one row out of forty thousand."
    },
    {
      "label": "About 200, the square root of the row count",
      "feedback": "Square root is the right instinct for some search problems, and this is not one of them. Halving discards half the remaining candidates every time, which is logarithmic rather than square root."
    },
    {
      "label": "About 40000, since every row has to be tried",
      "feedback": "That is the cost of scanning one row at a time, which is the method halving replaces. It is also the method most people reach for, which is why the file feels unmanageable."
    },
    {
      "label": "It depends entirely on where the bad row sits",
      "feedback": "Position matters for a linear scan, where an early row is lucky and a late one is not. Halving is insensitive to it: the count depends on the size of the file, not the location."
    }
  ]
}
\`\`\`

## Prefixes when the failure depends on history

Halving assumes any subset can be tested on its own. Plenty of failures do not work that way, because the function carries state forward and the bug depends on what came before.

\`\`\`python
def apply_ops(ops):
    balance = 100
    for op in ops:
        balance += op        # the contract says an op that would overdraw is skipped
    return balance
\`\`\`

No single \`op\` is bad here. \`-80\` is fine when the balance is 200 and wrong when the balance is 50. So the unit to shrink is the **prefix**: try \`ops[:1]\`, \`ops[:2]\`, \`ops[:3]\`, and stop at the first length that misbehaves. The last operation in that prefix is the one that tipped it over, and the prefix before it is the state that made it possible.

\`\`\`python
def shortest_failing_length(ops):
    for n in range(1, len(ops) + 1):
        if apply_ops(ops[:n]) != correct_apply(ops[:n]):
            return n
    return -1
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "prefix-not-element",
  "prompt": "For apply_ops above with ops = [10, 20, -500, 5], which shrinking strategy finds the trigger?",
  "options": [
    {
      "label": "Test each operation on its own, since one of them must be the bad one",
      "feedback": "Every operation is individually harmless: -500 on its own would be skipped by a correct implementation too. Testing them in isolation destroys the state that makes the bug possible."
    },
    {
      "label": "Test growing prefixes and stop at the first length that misbehaves",
      "correct": true,
      "feedback": "Right. The balance is carried forward, so the trigger is a position in the sequence rather than a value. The third prefix is the first one where the running balance would go negative."
    },
    {
      "label": "Remove the largest value and see whether the failure goes away",
      "feedback": "A reasonable heuristic that often works on numeric data, and it does happen to point at -500 here. It gives you no evidence about why, and it fails whenever the trigger is not the extreme value."
    },
    {
      "label": "Sort the operations first, so the shape of the input is normalised",
      "feedback": "Reordering changes the very thing under test, since this function's behavior depends on the order. A shrunk input has to remain a valid input for the original question."
    }
  ]
}
\`\`\`

## Shrink the value, not just the length

Once the input is short, keep going on the contents. Replace long strings with short ones, big numbers with small ones, real names with \`"a"\`. Every simplification that preserves the failure removes a thing you would otherwise have to think about.

A good stopping point looks like this:

\`\`\`python
assert apply_ops([-200]) == 100    # fails: returns -100
\`\`\`

One operation, round numbers, and the bug is now impossible to misread: the function applied an operation that should have been skipped. Compare that to "the balance is wrong after importing the March file".

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "good-minimal-repro",
  "prompt": "Sort each reproduction by whether it is finished shrinking or still has work left.",
  "buckets": ["Small enough to act on", "Still needs shrinking"],
  "items": [
    {
      "label": "assert average([2, None]) == 2.0",
      "bucket": "Small enough to act on",
      "feedback": "Two elements, one of which is the suspicious one, and round numbers. Removing either element would change what is being tested."
    },
    {
      "label": "The nightly job fails when run against the staging database",
      "bucket": "Still needs shrinking",
      "feedback": "No input is named at all, so nobody can reproduce it without recreating an entire environment first."
    },
    {
      "label": "assert parse('2026-13-01') raises ValueError",
      "bucket": "Small enough to act on",
      "feedback": "A single string, and the part that matters, the impossible month, is visible in it without any explanation."
    },
    {
      "label": "It crashes on customers.csv, attached, 12MB",
      "bucket": "Still needs shrinking",
      "feedback": "Reproducible, which is genuinely more than most reports offer, but the triggering row is still hidden among tens of thousands of others."
    },
    {
      "label": "It returns the wrong total for orders where the discount is applied twice and the customer is in the EU and the currency is not USD",
      "bucket": "Still needs shrinking",
      "feedback": "Three conditions are named and it is unknown which of them matter. Dropping one at a time until the failure disappears is the next step."
    }
  ]
}
\`\`\`

## Keep the shrunk input

The minimal reproduction is not scaffolding you throw away when the fix lands. It is the regression test, already written, in the form that is easiest to read. Copy it into the suite and name it after what it proves.

**Interview nuance:** given a failing test and a large input, the strongest opening move is out loud: "before I read the function, let me cut this input down." It shows you know that debugging is a search problem rather than a reading problem, and it converts a vague situation into a small one within a minute. Candidates who start by reading the function line by line are still reading it when the time runs out.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "shrink-cumulative",
  "prompt": "You have shrunk a 40000 row failure down to two rows. Removing either row makes it pass. What have you got?",
  "options": [
    {
      "label": "Two suspicious rows, which you now need to inspect for bad data",
      "feedback": "Worth a glance, and often the rows turn out to be entirely ordinary. If each is fine on its own then the data is not the story, the interaction between them is."
    },
    {
      "label": "A minimal reproduction, which points at the interaction between them as the bug",
      "correct": true,
      "feedback": "Right. Minimality is the finding: neither row triggers it alone, so the defect lives in how the function combines them, such as a duplicate key or an overlapping range."
    },
    {
      "label": "Proof that the file was corrupt",
      "feedback": "It is a possible explanation and the easiest one to check first. Nothing here supports it though, and blaming the input is how a real defect gets closed as not-a-bug."
    },
    {
      "label": "An input too small to be representative, so you should scale it back up",
      "feedback": "The worry that a small case is unrealistic is understandable and backwards here. The small input still fails, which makes it exactly as real as the large one and far easier to reason about."
    }
  ],
  "reveal": "Halve when the parts are independent, take prefixes when state is carried forward, then shrink the values too. What you are left with is both the diagnosis and the regression test."
}
\`\`\``,
    demoCode: `def apply_ops(ops):
    balance = 100
    for op in ops:
        balance += op      # the contract says an overdrawing op is skipped
    return balance


for n in range(1, 5):
    prefix = [10, 20, -500, 5][:n]
    print(prefix, "->", apply_ops(prefix))`,
  },
  apply: {
    id: "py-l5-shrink-apply",
    executionMode: "single-file",
    prompt: `Write a function \`shortest_failing_length(ops)\` that returns the length of the shortest
prefix of \`ops\` on which \`apply_ops\` disagrees with its contract, or \`-1\` when no prefix does.

The contract: \`apply_ops(ops)\` starts from a balance of \`100\` and applies each operation in order,
**skipping** any operation that would take the balance below zero. It returns the final balance.

The generated version in the starter never skips anything. No single operation is wrong on its own,
so shrink by prefix rather than by element. Keep \`shortest_failing_length\` as the last function in
the file.`,
    starterCode: `def apply_ops(ops):
    # Generated code under review. Leave it exactly as it is.
    balance = 100
    for op in ops:
        balance += op
    return balance


def shortest_failing_length(ops):
    # Return the length of the shortest failing prefix of ops, or -1.
    pass`,
    hints: [
      "Write the correct version first: it is the same loop with an `if balance + op >= 0:` guard.",
      "Loop `n` from 1 to `len(ops)` and compare the two functions on `ops[:n]`.",
      "Return `n`, the length, rather than the index of the operation that tipped it over.",
    ],
    referenceSolution: `def apply_ops(ops):
    balance = 100
    for op in ops:
        balance += op
    return balance


def correct_apply(ops):
    balance = 100
    for op in ops:
        if balance + op >= 0:
            balance += op
    return balance


def shortest_failing_length(ops):
    for n in range(1, len(ops) + 1):
        if apply_ops(ops[:n]) != correct_apply(ops[:n]):
            return n
    return -1`,
    testCases: [
      {
        input: { ops: [-50, -30] },
        expected: -1,
        description: "the balance never goes below zero",
      },
      {
        input: { ops: [-50, -80, 10] },
        expected: 2,
        description: "the second operation overdraws",
      },
      { input: { ops: [-200] }, expected: 1, description: "one operation is enough" },
      {
        input: { ops: [10, 20, -500, 5] },
        expected: 3,
        description: "two harmless operations first",
      },
    ],
  },
  practice: {
    id: "py-l5-shrink-practice",
    executionMode: "single-file",
    prompt: `Your latency dashboard went blank overnight and the on-call engineer pasted a list of two
thousand recorded response times into the ticket with the note "it crashes on this". You need
something a reviewer can read in one line before you can even start on the fix.

Write a function \`smallest_failing_prefix(times)\` that returns the shortest prefix of \`times\`
(as a list, with at least one element) on which \`average_response\` disagrees with its contract, or
an empty list when no prefix does.

The contract: \`average_response(times)\` returns the mean of the recorded times, ignoring any entry
recorded as \`None\` because that request never completed, and returns \`0.0\` when there is nothing
left to average. Keep \`smallest_failing_prefix\` as the last function in the file.`,
    starterCode: `def average_response(times):
    # Generated code under review. Leave it exactly as it is.
    return sum(times) / len(times)


def smallest_failing_prefix(times):
    # Return the shortest failing prefix as a list, or [] if there is none.
    pass`,
    hints: [
      "Write the correct version first: filter out the `None` entries, then guard the empty case.",
      "Try prefixes of length 1, 2, 3 and so on, and return `times[:n]` for the first one that misbehaves.",
      "A prefix can fail by raising rather than by returning a wrong number, so wrap the call in `try`.",
    ],
    referenceSolution: `def average_response(times):
    return sum(times) / len(times)


def correct_average(times):
    real = [t for t in times if t is not None]
    if not real:
        return 0.0
    return sum(real) / len(real)


def smallest_failing_prefix(times):
    for n in range(1, len(times) + 1):
        prefix = times[:n]
        try:
            actual = average_response(prefix)
        except Exception:
            return prefix
        if actual != correct_average(prefix):
            return prefix
    return []`,
    testCases: [
      {
        input: { times: [100, 200, null, 300] },
        expected: [100, 200, null],
        description: "the third entry never completed",
      },
      {
        input: { times: [50, 70] },
        expected: [],
        description: "every entry completed, so nothing fails",
      },
      {
        input: { times: [null] },
        expected: [null],
        description: "the very first entry is the trigger",
      },
      {
        input: { times: [5, null, 7] },
        expected: [5, null],
        description: "one good entry before the trigger",
      },
    ],
  },
}

const repairLesson: PythonLesson = {
  id: "py-l5-repair-not-rewrite",
  title: "Repair, do not rewrite",
  summary:
    "The instinct to throw the function away and start again feels efficient and quietly discards every case it already got right.",
  estimatedMinutes: 22,
  difficulty: "medium",
  skills: ["debugging", "minimal change", "regression tests", "code review"],
  teach: {
    estimatedMinutes: 8,
    markdown: `## Why the rewrite is tempting and usually wrong

You have found the bug. The function is not how you would have written it. Rewriting it will take four minutes and the result will be code you understand completely.

Here is what that trade actually costs. The function in front of you already handles cases you have not thought about: the empty input somebody hit in March, the negative quantity that a refund flow produces, the currency rounding rule that took two days to get right. None of that is documented and some of it is invisible in the code, sitting in an \`if\` that looks redundant until you delete it.

A rewrite throws all of it away and replaces it with your model of the problem, which is one afternoon old. The bug you set out to fix does get fixed. What you cannot see is the three you reintroduced.

**The default is the smallest change that makes the failing case pass without changing any passing case.**

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "redundant-looking-guard",
  "prompt": "While fixing a bug you find this line near the top of the function: if not rows: return []. The bug you are fixing has nothing to do with empty input. What should you do with the line?",
  "options": [
    {
      "label": "Delete it, since the loop below handles an empty list correctly anyway",
      "feedback": "Very likely true today and it is exactly how guards get removed. If the loop really is equivalent, deleting it changes nothing that matters and risks something you have not checked."
    },
    {
      "label": "Leave it alone, because it is outside the change you came to make",
      "correct": true,
      "feedback": "Right. A repair that also tidies unrelated lines is much harder to review, and any regression it causes is now attributed to the bug fix rather than the cleanup."
    },
    {
      "label": "Move it into the caller where the empty case originates",
      "feedback": "Sometimes the right long-term design, and it is still a separate change. Doing it inside a bug fix means one commit that both repairs and relocates behavior."
    },
    {
      "label": "Replace it with an assertion so the empty case becomes visible",
      "feedback": "Turning a handled case into a crash is a behavior change dressed up as a diagnostic. Whoever relied on the empty result would now get an exception in production."
    }
  ]
}
\`\`\`

## The repair loop

Four steps, in this order, every time.

1. **Pin the failure.** Write the assertion that fails now. If you cannot, you do not yet know what the bug is.
2. **Find the smallest change** that makes it pass. Usually one line, often one operator or one guard.
3. **Run the other cases.** The repair is not done because the new test is green. It is done when the new test is green and nothing else turned red.
4. **Keep the assertion.** It goes into the suite named after the claim it makes.

The second step is where judgment lives. Minimal does not mean cheapest to type. \`if page == 0: page = 1\` makes one failing test pass and leaves \`page = -3\` broken. \`page = max(1, page)\` handles the whole class the contract describes, in the same amount of code.

\`\`\`python
def page_slice(items, page, per_page):
    page = max(1, page)                # the class, not the one failing value
    start = (page - 1) * per_page
    return items[start : start + per_page]
\`\`\`

The test tells you the case. The **contract** tells you the class. Repair to the class.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "repair-the-class",
  "prompt": "A price function must never return a negative amount. It currently returns -100 for one input. Which repair is right?",
  "options": [
    {
      "label": "if total == -100: return 0",
      "feedback": "It makes the failing test pass, which is the only thing it does. Every other combination of inputs that overshoots still returns a negative price."
    },
    {
      "label": "return max(0, total)",
      "correct": true,
      "feedback": "Right. The contract says never negative, so the repair covers every input that could go below zero rather than the single one your test happened to find."
    },
    {
      "label": "Raise a ValueError when the total is negative",
      "feedback": "It does make the violation loud, and for an internal invariant that can be the right call. Here it changes the contract from returning a floor to failing, which callers are not prepared for."
    },
    {
      "label": "Rewrite the discount logic so a negative total cannot arise",
      "feedback": "The most thorough option and the most expensive one, and it may well be the right follow-up. As a bug fix it replaces working logic to address a case one guard handles."
    }
  ]
}
\`\`\`

## Repairs that break something else

Every guard you add is a behavior change for some input, and the inputs you were not thinking about are the ones that bite.

\`\`\`python
# Bug: crashes on an empty list.
def average(values):
    return sum(values) / len(values)

# Repair A
def average(values):
    if not values:
        return 0
    return sum(values) / len(values)

# Repair B
def average(values):
    if not values:
        return None
    return sum(values) / len(values)
\`\`\`

Both stop the crash. They are not equivalent, and choosing between them is not a matter of taste. If the caller displays the result, \`0\` reads as "the average is zero", which is a claim about data that does not exist. If the caller sums averages, \`None\` crashes one line later instead. The contract has to decide, and if the contract does not say, that is the review comment: ask, do not guess.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "repair-scope",
  "prompt": "You are fixing one bug in a generated function. Sort each change by whether it belongs in this commit.",
  "buckets": ["Part of the repair", "A separate change"],
  "items": [
    {
      "label": "Adding a guard for the input class the contract describes",
      "bucket": "Part of the repair",
      "feedback": "This is the fix itself, written to cover the class rather than the single failing value."
    },
    {
      "label": "Renaming three variables to be clearer",
      "bucket": "A separate change",
      "feedback": "It touches lines unrelated to the defect and makes the diff harder to review for the thing that actually changed."
    },
    {
      "label": "Adding the failing case to the test suite",
      "bucket": "Part of the repair",
      "feedback": "The assertion is what proves the fix was needed and stops the same bug returning, so it ships with the fix."
    },
    {
      "label": "Replacing the loop with a comprehension because it is shorter",
      "bucket": "A separate change",
      "feedback": "A rewrite of working code inside a bug fix. If it introduces a regression, the commit that caused it looks like the bug fix."
    },
    {
      "label": "Narrowing an except Exception that was hiding the failure",
      "bucket": "Part of the repair",
      "feedback": "The broad except is why the bug was invisible, so narrowing it is part of fixing this defect rather than a tidy-up."
    }
  ]
}
\`\`\`

**Interview nuance:** in a debugging exercise, saying "I could rewrite this but I would rather make the minimal change and keep the behavior it already has" is a signal that you have maintained code someone else wrote. It is also the answer that keeps you inside the time limit, because a rewrite always takes longer than it looks and the interviewer is watching the clock.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "repair-cumulative",
  "prompt": "Your one-line repair makes the failing test pass, and two previously green tests are now red. What is the most likely explanation?",
  "options": [
    {
      "label": "Those two tests were wrong and should be updated to the new behavior",
      "feedback": "Occasionally true, and it is the most dangerous conclusion to reach first because it is always available. Editing a red test to match new behavior can hide a real regression permanently."
    },
    {
      "label": "Your repair changed behavior for a class of input wider than the bug",
      "correct": true,
      "feedback": "Right. Two independent tests turning red is strong evidence that the guard caught cases that were already handled correctly, so the repair needs narrowing."
    },
    {
      "label": "The test suite is flaky and they should be run again",
      "feedback": "Worth ruling out in a suite with real flakiness, and cheap to check. Two failures appearing exactly when you changed one line is a poor fit for randomness."
    },
    {
      "label": "The bug was deeper than one line and the function needs rewriting",
      "feedback": "This is the conclusion the rewrite instinct wants, and it may eventually be right. Reaching it before reading the two failures skips the step that would tell you which class you over-caught."
    }
  ],
  "reveal": "Pin the failure, change the smallest thing that covers the class the contract names, re-run everything, keep the assertion. A rewrite is a separate decision made with a clear head, not a debugging step."
}
\`\`\``,
    demoCode: `def page_slice(items, page, per_page):
    start = page * per_page          # page is documented as 1-based
    return items[start : start + per_page]


rows = [10, 20, 30, 40, 50, 60, 70]
print(page_slice(rows, 1, 3))    # [40, 50, 60], and page 1 should be [10, 20, 30]`,
  },
  apply: {
    id: "py-l5-repair-not-rewrite-apply",
    executionMode: "single-file",
    prompt: `Repair \`final_price\` in the starter so it satisfies its contract, changing as little as
possible.

The contract: \`final_price(cents, percent_off, flat_off_cents)\` returns the price in whole cents
after a percentage discount and then a flat discount. \`percent_off\` is clamped into the range 0 to
100 first, so a value below 0 counts as 0 and a value above 100 counts as 100. The percentage
discount is \`cents * percent_off // 100\` (floor division, so it is already a whole number of
cents). The flat discount is then subtracted. The result is never below \`0\`.

The generated version applies both discounts and clamps neither end. Fix the class of inputs the
contract describes, not just one value.`,
    starterCode: `def final_price(cents, percent_off, flat_off_cents):
    # Generated code. It priced the example in the ticket correctly.
    return cents - cents * percent_off // 100 - flat_off_cents`,
    hints: [
      "Clamp the percentage before you use it: `min(100, max(0, percent_off))`.",
      "Clamp the result at the end with `max(0, ...)` so a large flat discount cannot go negative.",
      "Keep the floor division exactly as it is. The contract specifies that rounding.",
    ],
    referenceSolution: `def final_price(cents, percent_off, flat_off_cents):
    percent = min(100, max(0, percent_off))
    discount = cents * percent // 100
    return max(0, cents - discount - flat_off_cents)`,
    testCases: [
      {
        input: { cents: 1000, percent_off: 10, flat_off_cents: 0 },
        expected: 900,
        description: "the example from the ticket still prices correctly",
      },
      {
        input: { cents: 1000, percent_off: 50, flat_off_cents: 600 },
        expected: 0,
        description: "the discounts together exceed the price",
      },
      {
        input: { cents: 1000, percent_off: 150, flat_off_cents: 0 },
        expected: 0,
        description: "a percentage above one hundred",
      },
      {
        input: { cents: 500, percent_off: -20, flat_off_cents: 100 },
        expected: 400,
        description: "a negative percentage must not add money",
      },
    ],
  },
  practice: {
    id: "py-l5-repair-not-rewrite-practice",
    executionMode: "single-file",
    prompt: `Search results on your site are paginated, and users have started reporting that the first
page of results is missing the top matches. An assistant generated the \`page_slice\` function in the
starter, and the reviewer's manual test used page 2, where the numbers happened to look plausible.

Repair \`page_slice\` so it satisfies its contract, changing as little as possible.

The contract: \`page_slice(items, page, per_page)\` returns the items on the requested page, where
\`page\` is 1-based, so page 1 is the first \`per_page\` items. A page past the end of the list returns
an empty list. A page number below 1 is treated as page 1.`,
    starterCode: `def page_slice(items, page, per_page):
    # Generated code. Page 2 looked right, so nobody checked page 1.
    start = page * per_page
    return items[start : start + per_page]`,
    hints: [
      "A 1-based page number means the offset is `(page - 1) * per_page`.",
      "Clamp the page rather than special-casing 0: `page = max(1, page)` covers every value below 1.",
      "A slice past the end of a list already returns an empty list, so that rule needs no code.",
    ],
    referenceSolution: `def page_slice(items, page, per_page):
    page = max(1, page)
    start = (page - 1) * per_page
    return items[start : start + per_page]`,
    testCases: [
      {
        input: { items: [10, 20, 30, 40, 50, 60, 70], page: 1, per_page: 3 },
        expected: [10, 20, 30],
        description: "page one starts at the first item",
      },
      {
        input: { items: [10, 20, 30, 40, 50, 60, 70], page: 3, per_page: 3 },
        expected: [70],
        description: "the last page is short",
      },
      {
        input: { items: [10, 20, 30, 40, 50, 60, 70], page: 9, per_page: 3 },
        expected: [],
        description: "a page past the end",
      },
      {
        input: { items: [10, 20, 30, 40, 50, 60, 70], page: -1, per_page: 3 },
        expected: [10, 20, 30],
        description: "a page number below one",
      },
    ],
  },
}

const costLesson: PythonLesson = {
  id: "py-l5-cost",
  title: "The cost you asked for is not the cost you got",
  summary:
    "Correct output, wrong cost. Learn to read a body for the work it hides, and to count that work exactly rather than guess at it.",
  estimatedMinutes: 24,
  difficulty: "hard",
  skills: ["complexity", "performance review", "code reading", "verification"],
  teach: {
    estimatedMinutes: 9,
    markdown: `## The bug that passes every test

You asked for a linear solution. What came back is correct on every input you tried, reads cleanly, and is quadratic. There is no failing test to find, because there is no wrong answer. The defect only exists at a size your tests never reach, and it shows up in production as a job that used to take ninety seconds and now takes forty minutes.

This is the one failure signature you cannot catch by comparing outputs. You have to read for it.

## Where the hidden loop lives

Python hides iteration behind operators and methods that look like single steps. Four shapes account for nearly all of it.

**Membership in a list.**

\`\`\`python
seen = []
for n in nums:
    if n in seen:        # scans every element of seen
        return True
    seen.append(n)
\`\`\`

\`n in seen\` is a loop wearing a keyword. Inside another loop it is quadratic. \`n in some_set\` and \`key in some_dict\` are not, which is why the fix is usually a one-word change.

**Removing from the front of a list.**

\`\`\`python
while queue:
    job = queue.pop(0)   # shifts every remaining element left by one
\`\`\`

\`pop(0)\` is linear because a list is a contiguous block. \`collections.deque\` has \`popleft\` for exactly this.

**Building a string by adding to it.**

\`\`\`python
out = ""
for line in lines:
    out = out + line + "\\n"   # allocates a new string of the full length, every time
\`\`\`

Strings are immutable, so each round copies everything accumulated so far. Ten thousand lines of eighty characters copies about four billion characters. \`"".join(parts)\` copies each character once.

**Sorting inside a loop.**

\`\`\`python
for user in users:
    ranked = sorted(scores)      # the same sort, n times
    ...
\`\`\`

Correct, and it repeats identical work per iteration. Hoisting it above the loop is usually the whole fix.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "membership-in-list",
  "prompt": "A generated has_duplicate keeps a list called seen and tests if n in seen inside its loop. What is its cost on a list of n distinct values, and what is the smallest fix?",
  "options": [
    {
      "label": "Linear, and no fix is needed, because the loop runs once per element",
      "feedback": "The outer loop does run once per element, which is what makes this read as linear. The membership test inside it is itself a loop over everything collected so far."
    },
    {
      "label": "Quadratic, and the fix is to make seen a set",
      "correct": true,
      "feedback": "Right. Membership in a list scans it, so the work grows with the square of the input. A set answers the same question by hash, in constant time, and the rest of the code is unchanged."
    },
    {
      "label": "Quadratic, and the fix is to sort the input first",
      "feedback": "Sorting does enable a linear duplicate scan, so this is a real technique. It costs an extra sort, destroys the original order, and changes far more code than swapping one container."
    },
    {
      "label": "Linear, because append is constant time",
      "feedback": "Append genuinely is constant time on average, so half the loop body is cheap. The membership test on the line above it is the part that scans."
    }
  ]
}
\`\`\`

## Count it, do not estimate it

Big O is the right language for a review comment and the wrong tool for convincing yourself. When you want to know whether a body is really quadratic, count the operations exactly for a small input. It takes a minute and it is not arguable.

\`\`\`python
def scan_steps(nums):
    """How many element comparisons does 'n in seen' actually perform?"""
    seen = []
    steps = 0
    for n in nums:
        for candidate in seen:      # what 'in' does, written out
            steps += 1
            if candidate == n:
                return steps        # 'in' stops at the first match, and so does the outer loop
        seen.append(n)
    return steps
\`\`\`

Writing the hidden loop out by hand is the technique. Once \`in\` is a visible \`for\`, the cost is not a judgment call, and details you would have hand-waved past become obvious: the scan stops at the first match, and finding a duplicate ends the whole function early. That is why a list full of duplicates is fast and a list of distinct values is the worst case.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "count-the-comparisons",
  "prompt": "For the has_duplicate loop above with nums = [1, 2, 3], how many element comparisons does the membership test perform in total?",
  "options": [
    {
      "label": "0, because there are no duplicates to find",
      "feedback": "No match is ever found, which is true. Every comparison still happens: the scan has to look at each collected element before it can conclude there is no match."
    },
    {
      "label": "3",
      "correct": true,
      "feedback": "Right. The first element scans an empty list for 0 comparisons, the second scans one element, the third scans two, giving 0 plus 1 plus 2."
    },
    {
      "label": "6, one comparison per pair of elements",
      "feedback": "Every pair is a reasonable model and it double counts here. Each pair is only compared once, when the later element scans back over the earlier one."
    },
    {
      "label": "9, since the loop runs three times over three elements",
      "feedback": "Three times three is the shape of the worst case for a fully nested loop. The inner scan only covers the elements collected so far, so it is 0, then 1, then 2."
    }
  ]
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "linear-or-quadratic",
  "prompt": "Each snippet is the body of a loop over n items. Sort each by the total work it does.",
  "buckets": ["Linear overall", "Quadratic overall"],
  "items": [
    {
      "label": "seen.add(item) where seen is a set",
      "bucket": "Linear overall",
      "feedback": "A set add hashes the value and stores it, which does not depend on how many items are already in the set."
    },
    {
      "label": "if item in results where results is a list",
      "bucket": "Quadratic overall",
      "feedback": "Membership in a list scans it, and the list grows with every iteration, so the total work is the sum 1 plus 2 plus 3 and so on."
    },
    {
      "label": "parts.append(text)",
      "bucket": "Linear overall",
      "feedback": "Appending to a list is constant time on average, so building a list of n pieces is linear no matter how long the pieces are."
    },
    {
      "label": "report = report + text",
      "bucket": "Quadratic overall",
      "feedback": "Strings are immutable, so each concatenation copies everything accumulated so far into a new string."
    },
    {
      "label": "queue.pop(0)",
      "bucket": "Quadratic overall",
      "feedback": "Removing the front element shifts every remaining element left by one position, so draining a list this way is quadratic."
    },
    {
      "label": "counts[key] = counts.get(key, 0) + 1",
      "bucket": "Linear overall",
      "feedback": "Both the dictionary lookup and the assignment are constant time, so counting n items costs linear work in total."
    }
  ]
}
\`\`\`

## Say it as a review comment

"This is O(n squared)" invites a debate about whether n is ever large. The version that gets fixed names the line, the input size, and the swap.

> \`seen\` is a list, so \`n in seen\` on line 6 scans it. On the 200k-row import that is about twenty billion comparisons. Making \`seen\` a set is a one-word change and the rest of the function is unaffected.

**Interview nuance:** when you are asked to review a solution, cost is the dimension most candidates skip entirely, so raising it is disproportionately valuable. The strongest form is not the label but the mechanism: "this reads as one pass, but the membership test on line 6 is itself a scan, so it is quadratic." Anyone can recite complexity classes. Pointing at the line that creates the hidden loop is what shows you read the code.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "cost-cumulative",
  "prompt": "A generated function is correct and quadratic. Your test suite runs it on 50 items and passes in milliseconds. What is the right action?",
  "options": [
    {
      "label": "Ship it, since correctness is what tests are for and it is fast enough today",
      "feedback": "Defensible when the input truly is bounded, and worth saying out loud so the assumption is recorded. It is a bet on an input size nobody has committed to keeping small."
    },
    {
      "label": "Name the line that hides the loop and give the expected size at production scale",
      "correct": true,
      "feedback": "Right. The finding is not visible in any test result, so the review comment is the only channel. Naming the line and the real input size makes it a decision rather than an opinion."
    },
    {
      "label": "Add a test with 500000 items so the suite catches it",
      "feedback": "It does convert the problem into a red test, which is appealing. It also makes the suite slow for everyone forever and only fails once the code is already written the wrong way."
    },
    {
      "label": "Rewrite it yourself before merging, since the fix is usually one word",
      "feedback": "Often true and often welcome, especially for a one-word swap. Doing it silently means the author never learns the shape, and you now own a function you did not write."
    }
  ],
  "reveal": "Membership in a list, pop from the front, string concatenation in a loop, and sorting inside a loop. Write the hidden loop out by hand and count it. Cost is the one defect no output comparison can find."
}
\`\`\``,
    demoCode: `def scan_steps(nums):
    seen = []
    steps = 0
    for n in nums:
        for candidate in seen:      # what 'n in seen' really does
            steps += 1
            if candidate == n:
                return steps
        seen.append(n)
    return steps


print(scan_steps([1, 2, 3]))        # 3
print(scan_steps(list(range(50))))  # 1225`,
  },
  apply: {
    id: "py-l5-cost-apply",
    executionMode: "single-file",
    prompt: `Write a function \`scan_steps(nums)\` that returns the exact number of element comparisons
the membership test in \`has_duplicate\` performs on \`nums\`.

\`has_duplicate\` is in the starter. It keeps a list called \`seen\` and asks \`if n in seen\`. That test
walks \`seen\` from the front, comparing one element at a time, and stops as soon as it finds a match.
When it finds one, \`has_duplicate\` returns immediately and no further comparisons happen.

Count every comparison the test performs across the whole call. Keep \`scan_steps\` as the last
function in the file.`,
    starterCode: `def has_duplicate(nums):
    # Generated code under review. Leave it exactly as it is.
    seen = []
    for n in nums:
        if n in seen:
            return True
        seen.append(n)
    return False


def scan_steps(nums):
    # Return how many element comparisons "n in seen" performs in total.
    pass`,
    hints: [
      "Write the hidden loop out: replace `if n in seen` with a `for candidate in seen` loop you can count.",
      "Increment the counter before comparing, since a comparison happens whether or not it matches.",
      "A match ends the whole function, so return the count from inside the inner loop rather than continuing.",
    ],
    referenceSolution: `def has_duplicate(nums):
    seen = []
    for n in nums:
        if n in seen:
            return True
        seen.append(n)
    return False


def scan_steps(nums):
    seen = []
    steps = 0
    for n in nums:
        for candidate in seen:
            steps += 1
            if candidate == n:
                return steps
        seen.append(n)
    return steps`,
    testCases: [
      {
        input: { nums: [1, 2, 3] },
        expected: 3,
        description: "no duplicates, so every scan runs to the end",
      },
      {
        input: { nums: [1, 1] },
        expected: 1,
        description: "the duplicate is found on the first comparison",
      },
      {
        input: { nums: [1, 2, 3, 2] },
        expected: 5,
        description: "the duplicate is found part way through the last scan",
      },
      { input: { nums: [] }, expected: 0, description: "nothing to compare" },
    ],
  },
  practice: {
    id: "py-l5-cost-practice",
    executionMode: "single-file",
    prompt: `Your nightly export builds a CSV in memory with \`report = report + row + "\\n"\` inside a
loop, and it has started missing its window. Before you change anything you want a number to put in
the ticket, because "string concatenation is slow" has already been dismissed once as premature
optimisation.

Write a function \`rows_within_budget(row_length, budget)\` that returns the largest number of rows
the loop can append before the total characters it has copied would exceed \`budget\`.

Every row has exactly \`row_length\` characters, and the loop adds a newline to each, so appending a
row produces a new string one row longer than the previous one. The characters copied by an append
is the length of the string it produces. Count zero rows as costing nothing.`,
    starterCode: `def build_report(rows):
    # The loop under review. Every append copies the whole accumulated string.
    report = ""
    for row in rows:
        report = report + row + "\\n"
    return report


def rows_within_budget(row_length, budget):
    # Return how many rows fit before the total characters copied exceeds budget.
    pass`,
    hints: [
      "After the first append the string is `row_length + 1` characters, after the second it is twice that, and so on.",
      "Keep a running `total` of characters copied and stop before the append that would push it past `budget`.",
      "A budget of 0 fits no rows at all, since even the first append copies something.",
    ],
    referenceSolution: `def build_report(rows):
    report = ""
    for row in rows:
        report = report + row + "\\n"
    return report


def rows_within_budget(row_length, budget):
    total = 0
    length = 0
    rows = 0
    while True:
        length += row_length + 1
        if total + length > budget:
            return rows
        total += length
        rows += 1`,
    testCases: [
      { input: { row_length: 9, budget: 100 }, expected: 4, description: "ten characters per row" },
      {
        input: { row_length: 99, budget: 100 },
        expected: 1,
        description: "one long row uses the whole budget",
      },
      { input: { row_length: 9, budget: 0 }, expected: 0, description: "no budget at all" },
      {
        input: { row_length: 1, budget: 1000 },
        expected: 31,
        description: "short rows still hit the wall quickly",
      },
    ],
  },
}

// ───────────────────────────────────────────────────────────────────────────
// L5-M4: Calling a Model Like Any Other Unreliable Dependency
// ───────────────────────────────────────────────────────────────────────────

const modelDependencyLesson: PythonLesson = {
  id: "py-l5-model-dependency",
  title: "A model call is a network call",
  summary:
    "Slow, metered, and allowed to fail. Wrap it the way you would wrap any third party: a timeout, a bounded retry, a budget, and a defined answer for when it does not come back.",
  estimatedMinutes: 24,
  difficulty: "medium",
  skills: ["error handling", "retries", "reliability", "api integration"],
  teach: {
    estimatedMinutes: 9,
    markdown: `## What the call actually is

Strip away the interesting part and a model call is an HTTP request to somebody else's server. Everything you already know about third-party dependencies applies, and the parts people forget are exactly the parts they forget for payment gateways and geocoding APIs:

- It is **slow**, in seconds rather than milliseconds, and the variance is large.
- It **costs money** per call, roughly in proportion to the text going in and coming out.
- It **fails**, with timeouts, rate limits, overload responses, and transport errors.
- It returns **text**, which is not the same thing as data. That is the next lesson.

The exact client library differs between vendors and changes every few months, so the shape below is deliberately generic. What does not change is the wrapping.

\`\`\`python
answer = client.complete(prompt)     # one network call: slow, metered, failure-prone
\`\`\`

A line like that in the middle of a request handler, with nothing around it, is the same defect as an unwrapped call to a payment provider. It happens to be written by the person most excited about the feature, which is why it so often ships.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "no-timeout-consequence",
  "prompt": "A request handler calls a model with no timeout set. The provider starts responding in 90 seconds instead of 2. What breaks first?",
  "options": [
    {
      "label": "Nothing, users just see a slower page",
      "feedback": "That is what it looks like for the first few requests. Each of those slow requests is holding a worker the whole time, so the queue behind them grows faster than it drains."
    },
    {
      "label": "Your own service, because every worker is held waiting and new requests queue behind them",
      "correct": true,
      "feedback": "Right. A slow dependency without a timeout converts into an outage of your service, and pages that never touch the model go down alongside the ones that do."
    },
    {
      "label": "The provider, once your retries add enough load",
      "feedback": "Retry storms are a real way to make a struggling dependency worse, which is why backoff matters. Your own worker pool exhausts long before your traffic moves their needle."
    },
    {
      "label": "The database, because the connections stay open",
      "feedback": "Connections held across a slow external call are a genuine second-order problem worth checking. The immediate constraint is the worker itself, which is blocked whether or not it holds a connection."
    }
  ]
}
\`\`\`

## Four wrappings, always

**A timeout.** Pick one and pass it. Every client library takes one, and the default is usually far longer than you want. A timeout is how you convert an unbounded wait into a failure you can handle.

**A bounded retry.** Transient failures are common enough that one retry is worth it and unbounded retries are how you take down a recovering provider. Three attempts is a reasonable default, with a growing pause between them so a hundred clients do not all return at the same instant.

\`\`\`python
def call_with_retry(client, prompt, attempts=3):
    for attempt in range(attempts):
        try:
            return client.complete(prompt)
        except TransientError:
            if attempt == attempts - 1:
                raise
            sleep(2 ** attempt)      # 1s, then 2s: give the provider room
\`\`\`

**A budget.** Calls cost money and a loop over user-supplied input is a loop over your invoice. Count the calls and stop at a cap you chose, rather than at the one your finance team discovers.

**A defined answer for failure.** When the call does not come back, what does your function return? "It raises" is a legitimate answer. So is a cached previous result, a simpler non-model fallback, or a sentinel the caller can render. What is not legitimate is not having decided, because then the answer is whatever exception happens to escape.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "retry-or-not",
  "prompt": "Sort each failure from a model provider by whether retrying it is worth doing.",
  "buckets": ["Retry with backoff", "Do not retry"],
  "items": [
    {
      "label": "A 429 rate limit response",
      "bucket": "Retry with backoff",
      "feedback": "This is the provider asking you to slow down, so the same request will succeed shortly. Backoff is not optional here, it is the whole point."
    },
    {
      "label": "A 500 from the provider",
      "bucket": "Retry with backoff",
      "feedback": "A server-side error is usually transient, so the identical request has a good chance of succeeding on the next attempt."
    },
    {
      "label": "A 401 invalid API key",
      "bucket": "Do not retry",
      "feedback": "The credential will be exactly as invalid on the next attempt. Retrying turns a clear configuration error into a slow one."
    },
    {
      "label": "A connection timeout",
      "bucket": "Retry with backoff",
      "feedback": "Transport failures are the classic transient case, and the request may not even have reached the provider."
    },
    {
      "label": "A 400 saying the request exceeds the context limit",
      "bucket": "Do not retry",
      "feedback": "The request is too big and will still be too big next time. This needs shorter input, not another attempt."
    }
  ]
}
\`\`\`

## Retrying is only safe when repeating is safe

A retry sends the same request again, which is fine when the call only reads. It is not fine when the call causes something.

If the model call is one step in a flow that also charges a card, sends an email, or writes a row, ask what happens when step three fails after step two succeeded. The answer is usually that the retry must not repeat step two, which means the write needs an idempotency key or the retry has to be scoped to just the model call. This is the same reasoning you would apply to any external write, and generated code almost never includes it, because nothing in the prompt mentioned it.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "retry-side-effects",
  "prompt": "A function drafts an email with a model, then sends it. The send occasionally times out. A colleague wraps the whole function in a three-attempt retry. What is the risk?",
  "options": [
    {
      "label": "The drafts will differ between attempts, so the user gets an inconsistent email",
      "feedback": "Real and worth pinning down with a fixed seed or a cached draft. It is much less serious than what the send step does on a retry."
    },
    {
      "label": "A send that timed out after the provider accepted it is repeated, so the user gets several emails",
      "correct": true,
      "feedback": "Right. A timeout means you do not know whether the action happened, so retrying an action rather than a query can duplicate it. The retry belongs around the read, not the write."
    },
    {
      "label": "Nothing, since a failed send did not send anything",
      "feedback": "That is true for a clean rejection and not for a timeout, which is the case here. A timeout is silence, and silence does not tell you which side of the send you are on."
    },
    {
      "label": "The retry costs three times as much in model tokens",
      "feedback": "It genuinely does, and cost is a real reason to scope retries narrowly. Duplicate emails to a customer are the more serious of the two problems."
    }
  ]
}
\`\`\`

## Testing it without the network

You cannot write a reliable test against a live provider: it is slow, it costs money, and it will not fail on demand. So you do what you would do for any other dependency and hand your code a stand-in that fails exactly when you tell it to.

\`\`\`python
class FlakyModel:
    """A stand-in client. Each entry in script is what the next call does."""
    def __init__(self, script):
        self.script = list(script)
        self.calls = 0

    def complete(self, prompt):
        self.calls += 1
        step = self.script.pop(0)
        if step == "error":
            raise RuntimeError("upstream error")
        return step
\`\`\`

Now "the second attempt succeeds" is a test, and so is "every attempt fails", and both run in a millisecond. The counter matters as much as the responses: an implementation that retries forever and one that stops at three both pass a script of two errors, and only the call count separates them.

**Interview nuance:** "how would you test this?" applied to a model call is a question that separates people quickly. The weak answer describes checking the output text. The strong answer is that the provider gets replaced by a stand-in, and the tests are about attempt counts, timeouts, and what the function returns when the model never answers. That is ordinary dependency discipline, and the fact that the dependency is a model changes none of it.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "model-dependency-cumulative",
  "prompt": "You are reviewing a pull request whose diff is one line: summary = client.complete(prompt) inside a request handler. What is the first thing to ask for?",
  "options": [
    {
      "label": "A better prompt, since the output quality depends on it",
      "feedback": "Prompt quality does matter to the feature and is worth iterating on. It is not what turns a slow dependency into an outage of your own service."
    },
    {
      "label": "A timeout, a bounded retry, and a defined behavior when the call fails",
      "correct": true,
      "feedback": "Right. Those three are what stop somebody else's bad afternoon becoming yours, and none of them are visible in output quality, so only a reviewer will catch their absence."
    },
    {
      "label": "A cache, so repeated prompts do not cost twice",
      "feedback": "Often a genuine win for both cost and latency, and worth raising second. It does nothing for the first call, which is the one that can hang forever."
    },
    {
      "label": "A test that asserts the summary is accurate",
      "feedback": "Output quality is worth evaluating, though rarely with an equality assertion, since the text varies between runs. It is a separate concern from whether the call is safely wrapped."
    }
  ],
  "reveal": "Timeout, bounded retry with backoff, a call budget, and a defined answer for failure. A model is a third-party dependency, and the fact that its output is interesting does not exempt it from any of that."
}
\`\`\``,
    demoCode: `class FlakyModel:
    def __init__(self, script):
        self.script = list(script)
        self.calls = 0

    def complete(self, prompt):
        self.calls += 1
        step = self.script.pop(0)
        if step == "error":
            raise RuntimeError("upstream error")
        return step


model = FlakyModel(["error", "error", "summary text"])
for attempt in range(3):
    try:
        print("attempt", attempt + 1, "->", model.complete("summarise"))
        break
    except RuntimeError as exc:
        print("attempt", attempt + 1, "->", exc)`,
  },
  apply: {
    id: "py-l5-model-dependency-apply",
    executionMode: "single-file",
    prompt: `Write a function \`call_with_retry(script)\` that builds a \`FlakyModel(script)\`, asks it to
complete the prompt \`"summarise"\`, and returns the first response it gets back.

The rules: make at most **3** attempts in total. If an attempt raises, try again. If all 3 attempts
raise, return the string \`"unavailable"\` rather than letting the exception escape. Never make a
fourth call, even when the script still has entries left in it.

\`FlakyModel\` is in the starter: each entry of \`script\` says what the next call does, where
\`"error"\` raises and anything else is returned as the response text. Keep \`call_with_retry\` as the
last function in the file.`,
    starterCode: `class FlakyModel:
    """A stand-in model client. Each entry in script is what the next call does."""

    def __init__(self, script):
        self.script = list(script)
        self.calls = 0

    def complete(self, prompt):
        self.calls += 1
        step = self.script.pop(0)
        if step == "error":
            raise RuntimeError("upstream error")
        return step


def call_with_retry(script):
    # Build a FlakyModel(script), call complete("summarise") at most 3 times,
    # and return the first response or "unavailable".
    pass`,
    hints: [
      "Loop `for attempt in range(3)` and put the call inside a `try`.",
      "`return` the response from inside the `try` so a success stops the loop immediately.",
      "Return `'unavailable'` after the loop, which is only reached when all three attempts raised.",
    ],
    referenceSolution: `class FlakyModel:
    def __init__(self, script):
        self.script = list(script)
        self.calls = 0

    def complete(self, prompt):
        self.calls += 1
        step = self.script.pop(0)
        if step == "error":
            raise RuntimeError("upstream error")
        return step


def call_with_retry(script):
    model = FlakyModel(script)
    for _ in range(3):
        try:
            return model.complete("summarise")
        except RuntimeError:
            continue
    return "unavailable"`,
    testCases: [
      { input: { script: ["ok"] }, expected: "ok", description: "the first attempt succeeds" },
      {
        input: { script: ["error", "fine"] },
        expected: "fine",
        description: "one transient failure, then a response",
      },
      {
        input: { script: ["error", "error", "done"] },
        expected: "done",
        description: "the third and last attempt succeeds",
      },
      {
        input: { script: ["error", "error", "error", "never"] },
        expected: "unavailable",
        description: "the fourth call must never be made",
      },
    ],
  },
  practice: {
    id: "py-l5-model-dependency-practice",
    executionMode: "single-file",
    prompt: `Your support tool summarises each ticket in a queue with a model. Last week a provider
incident turned a nightly batch into a retry storm that ran for six hours and produced an invoice
nobody had approved, so every batch now has to run under a hard cap on how many calls it may make.

Write a function \`process_batch(scripts, call_budget)\` that returns a list with one result per
entry in \`scripts\`, in the same order.

The rules, applied to each entry in turn:

- If the number of calls already made has reached \`call_budget\`, record \`"[skipped]"\` and move on
  without calling at all.
- Otherwise attempt the call, retrying up to **3** attempts for that entry, and never make a call
  once the number of calls made has reached \`call_budget\`.
- Record the first response you get. If every attempt you were able to make raised, record
  \`"[unavailable]"\`.

\`FlakyModel\` is in the starter and each entry of \`scripts\` is one script for it. Keep
\`process_batch\` as the last function in the file.`,
    starterCode: `class FlakyModel:
    """A stand-in model client. Each entry in script is what the next call does."""

    def __init__(self, script):
        self.script = list(script)
        self.calls = 0

    def complete(self, prompt):
        self.calls += 1
        step = self.script.pop(0)
        if step == "error":
            raise RuntimeError("upstream error")
        return step


def process_batch(scripts, call_budget):
    # Return one result per script, respecting the total call budget.
    pass`,
    hints: [
      "Keep one `calls` counter across the whole batch, not one per entry.",
      "Check the budget before each individual call, including before the first attempt of an entry.",
      "Track whether the entry got to make any call at all: none means `[skipped]`, some but all failing means `[unavailable]`.",
    ],
    referenceSolution: `class FlakyModel:
    def __init__(self, script):
        self.script = list(script)
        self.calls = 0

    def complete(self, prompt):
        self.calls += 1
        step = self.script.pop(0)
        if step == "error":
            raise RuntimeError("upstream error")
        return step


def process_batch(scripts, call_budget):
    results = []
    calls = 0
    for script in scripts:
        model = FlakyModel(script)
        answer = None
        attempted = False
        for _ in range(3):
            if calls >= call_budget:
                break
            calls += 1
            attempted = True
            try:
                answer = model.complete("summarise")
                break
            except RuntimeError:
                answer = None
        if not attempted:
            results.append("[skipped]")
        elif answer is None:
            results.append("[unavailable]")
        else:
            results.append(answer)
    return results`,
    testCases: [
      {
        input: { scripts: [["error", "yes"], ["no"]], call_budget: 10 },
        expected: ["yes", "no"],
        description: "a retry inside a generous budget",
      },
      {
        input: { scripts: [["error", "error", "error"], ["hi"]], call_budget: 10 },
        expected: ["[unavailable]", "hi"],
        description: "one entry exhausts its three attempts",
      },
      {
        input: { scripts: [["error", "a"], ["b"], ["c"]], call_budget: 2 },
        expected: ["a", "[skipped]", "[skipped]"],
        description: "the budget runs out after the first entry",
      },
      {
        input: { scripts: [["ok"]], call_budget: 0 },
        expected: ["[skipped]"],
        description: "no budget at all means no calls at all",
      },
    ],
  },
}

const validateOutputLesson: PythonLesson = {
  id: "py-l5-validate-output",
  title: "Validate the output, always",
  summary:
    "A model returns text, not data. Parse it at the boundary, check every field you are about to use, and decide what happens when it does not match.",
  estimatedMinutes: 24,
  difficulty: "medium",
  skills: ["input validation", "json parsing", "defensive programming", "api integration"],
  teach: {
    estimatedMinutes: 9,
    markdown: `## Text that looks like data is still text

You asked for JSON. You got JSON, in your ten manual tests. On the eleventh call you get this:

\`\`\`text
Sure! Here is the analysis you asked for:

{"sentiment": "positive", "score": 8}

Let me know if you would like me to adjust anything.
\`\`\`

\`json.loads\` on that raises \`JSONDecodeError\` on the very first character. The model did nothing wrong by any definition it was given: it produced a helpful message that contains the object. Your code assumed the string **is** the object.

This is the same class of problem as parsing a user-uploaded CSV, and it deserves the same treatment. The boundary between "text from outside" and "data my code relies on" needs one function, and everything past that function is trusted because it was checked.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "prose-wrapped-json",
  "prompt": "Your code does data = json.loads(response) and the response begins with 'Sure! Here is the analysis:'. What happens?",
  "options": [
    {
      "label": "json.loads skips the leading text and parses the object it finds",
      "feedback": "That would be convenient and no JSON parser behaves this way. Parsing starts at the first character, and the letter S is not a valid start for any JSON value."
    },
    {
      "label": "It raises JSONDecodeError on the first character",
      "correct": true,
      "feedback": "Right, and it raises before any field is looked at, so the failure surfaces as a crash in the handler rather than as a bad value further downstream."
    },
    {
      "label": "It returns the whole response as a string, since a string is valid JSON",
      "feedback": "A JSON document really can be a bare string, so the instinct is not baseless. That would require the response to be quoted, and unquoted prose is not valid JSON at all."
    },
    {
      "label": "It returns None because the parse failed",
      "feedback": "Returning None on failure is what a wrapper you write would do, and it is a reasonable design. The standard library signals failure by raising, so unwrapped calls propagate the exception."
    }
  ]
}
\`\`\`

## The validation boundary

One function. It takes raw text and returns either the value your code wants, or a clear signal that it did not get one.

\`\`\`python
import json


def parse_review(raw):
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end < start:
        return None
    try:
        data = json.loads(raw[start : end + 1])
    except ValueError:
        return None
    if not isinstance(data, dict):
        return None
    sentiment = data.get("sentiment")
    score = data.get("score")
    if not isinstance(sentiment, str) or not sentiment:
        return None
    if isinstance(score, bool) or not isinstance(score, (int, float)):
        return None
    return {"sentiment": sentiment, "score": score}
\`\`\`

Every line is answering a question you would otherwise be answering at 3am.

**Locate the object.** Take everything from the first \`{\` to the last \`}\`. Crude, and it handles the overwhelmingly common case of an object wrapped in friendly prose or a code fence.

**Parse defensively.** \`json.loads\` raises on bad input, so the \`try\` is how failure becomes a return value instead of an escape.

**Check the shape.** Valid JSON can be a list, a number, or the string \`"null"\`. \`data.get(...)\` on a list raises \`AttributeError\`, so the type of the top-level value is checked before anything is read out of it.

**Check every field you will use.** Presence, type, and range are three separate questions. A key can be present and \`None\`. A score can be a string \`"8"\`. A rating meant to be 0 to 10 can be 47.

**Return one normalized shape.** Callers get either the dictionary they expect or \`None\`. They never get a half-validated dictionary with two good fields and one surprise.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "bool-is-an-int",
  "prompt": "A validator checks the score field with isinstance(score, (int, float)). The model returns {'sentiment': 'positive', 'score': true}. What happens?",
  "options": [
    {
      "label": "The check rejects it, since true is not a number",
      "feedback": "That is the intent of the line and not what Python does. bool is a subclass of int, so a boolean satisfies an isinstance check against int."
    },
    {
      "label": "The check accepts it, and True is used as a score of 1",
      "correct": true,
      "feedback": "Right. bool subclasses int in Python, so True passes the type check and then behaves as 1 in every arithmetic operation downstream. Rule out bool explicitly first."
    },
    {
      "label": "It raises a TypeError when the score is compared to a range",
      "feedback": "You would want a loud failure and Python gives you a quiet one. True compares to numbers happily, so True < 10 is fine and nothing raises."
    },
    {
      "label": "json.loads rejects it before the check runs",
      "feedback": "JSON has true and false as first class values, so the document is entirely valid. The parser hands back a Python bool without complaint."
    }
  ]
}
\`\`\`

## Deciding what a failure means

Returning \`None\` is a decision, not a default. The alternatives are real and the right one depends on what the caller does next.

| Situation | Reasonable response |
| --- | --- |
| One item in a batch of a thousand | Skip it, count it, log the raw text |
| The user is waiting on this one answer | Retry once, then show an honest failure message |
| The value feeds a payment or a permission | Fail closed, refuse, never guess |
| The field is decorative, like a suggested title | Fall back to a default and carry on |

What is not acceptable is silently substituting a plausible value. A missing score that becomes \`0\` will be averaged into a dashboard and nobody will ever know the difference between "rated zero" and "never rated". That is the same shape as the swallowed exception from earlier in this level, wearing different clothes.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "id": "validate-or-trust",
  "prompt": "Sort each field of a parsed model response by whether it needs checking before use.",
  "buckets": ["Check before using", "Safe to use as parsed"],
  "items": [
    {
      "label": "A score you are about to average into a dashboard",
      "bucket": "Check before using",
      "feedback": "Presence, type, and range all matter, because a missing value quietly becoming zero corrupts the average with no visible error."
    },
    {
      "label": "A category name you look up in a dictionary of handlers",
      "bucket": "Check before using",
      "feedback": "An unexpected category raises a KeyError at best, and at worst selects a handler you did not intend to expose."
    },
    {
      "label": "The result of json.dumps on a value you built yourself",
      "bucket": "Safe to use as parsed",
      "feedback": "This value never left your process, so there is no untrusted boundary between building it and reading it back."
    },
    {
      "label": "A row identifier you are about to write into a database query",
      "bucket": "Check before using",
      "feedback": "It arrived as text from outside your system, so it needs the same type and range checking as anything a user typed."
    },
    {
      "label": "A constant defined at the top of your own module",
      "bucket": "Safe to use as parsed",
      "feedback": "It is code you wrote and it is checked by review and by the type checker, so no runtime validation is required."
    }
  ]
}
\`\`\`

## Ask for a shape that is easy to check

There is a design lever here that is worth more than any parsing cleverness. The narrower the shape you ask for, the cheaper validation is. \`{"score": 8}\` is a stronger request than "tell me how positive this is", because you can check the former in three lines and the latter needs a judgment call. A short fixed vocabulary beats free text, and one flat object beats a nested structure whose depth you have to walk.

**Interview nuance:** if you say "the model returns text, so I would validate it at the boundary and decide what a failure means before I wire it into anything", you have described the same architecture you would use for a webhook, a file upload, or a partner API. Interviewers are checking that you treat the model as a normal untrusted input source, because the candidates who do not are the ones who ship a handler that crashes on the first friendly preamble.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "validate-output-cumulative",
  "prompt": "Your validator finds a response where score is present but is the string '8'. What is the right move?",
  "options": [
    {
      "label": "Call int(score), since the intent is obvious",
      "feedback": "It works for '8' and quietly extends to '8.5' raising, and to ' 8 ' succeeding. Coercion at the boundary is a decision worth making deliberately rather than by reflex."
    },
    {
      "label": "Treat it as invalid, unless the contract you wrote says a numeric string is acceptable",
      "correct": true,
      "feedback": "Right. Either the contract allows a numeric string and the validator converts it deliberately, or it does not and this is a rejection. What matters is that the rule is written down."
    },
    {
      "label": "Accept it as is, since Python will compare it to numbers anyway",
      "feedback": "Python will not: comparing a string to an int raises TypeError. The failure surfaces far from the boundary, in whatever code does the comparison."
    },
    {
      "label": "Retry the call until the model returns a number",
      "feedback": "A reasonable step for a genuinely malformed response, and it costs a call every time. Here the response is well formed and the only question is whether your contract accepts this type."
    }
  ],
  "reveal": "Locate, parse, check the shape, check every field you will use, return one normalized value. And decide what a failure means before you need the answer."
}
\`\`\``,
    demoCode: `import json

raw = 'Sure! Here is the analysis:\\n\\n{"sentiment": "positive", "score": 8}\\n\\nHope that helps.'

try:
    print(json.loads(raw))
except ValueError as exc:
    print("raw parse failed:", exc)

start = raw.find("{")
end = raw.rfind("}")
print(json.loads(raw[start : end + 1]))`,
  },
  apply: {
    id: "py-l5-validate-output-apply",
    executionMode: "single-file",
    prompt: `Write a function \`parse_review(raw)\` that turns the text a model returned into a validated
dictionary, or returns \`None\` when it cannot.

The contract: \`raw\` should contain a JSON object somewhere in it, possibly wrapped in prose. That
object must have a \`"sentiment"\` key holding a non-empty string and a \`"score"\` key holding a
number. On success return \`{"sentiment": <the string>, "score": <the number>}\`. On any failure,
including text that contains no object, text that is not valid JSON, a top-level value that is not
an object, a missing key, or a field of the wrong type, return \`None\`.

A boolean counts as a number in Python, so rule it out explicitly. \`json\` is already imported in the
starter.`,
    starterCode: `import json


def parse_review(raw):
    # Locate the object, parse it, check every field, and return None on any failure.
    pass`,
    hints: [
      "Slice from `raw.find('{')` to `raw.rfind('}') + 1` before parsing, so surrounding prose is dropped.",
      "Wrap `json.loads` in `try` / `except ValueError` and return `None` from the except block.",
      "`isinstance(True, int)` is `True`, so check `isinstance(score, bool)` first and reject it.",
    ],
    referenceSolution: `import json


def parse_review(raw):
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end < start:
        return None
    try:
        data = json.loads(raw[start : end + 1])
    except ValueError:
        return None
    if not isinstance(data, dict):
        return None
    sentiment = data.get("sentiment")
    score = data.get("score")
    if not isinstance(sentiment, str) or not sentiment:
        return None
    if isinstance(score, bool) or not isinstance(score, (int, float)):
        return None
    return {"sentiment": sentiment, "score": score}`,
    testCases: [
      {
        input: { raw: '{"sentiment": "positive", "score": 8}' },
        expected: { sentiment: "positive", score: 8 },
        description: "a bare object with both fields",
      },
      {
        input: {
          raw: 'Here is the result:\n{"sentiment": "negative", "score": 2}\nHope that helps.',
        },
        expected: { sentiment: "negative", score: 2 },
        description: "the object is wrapped in friendly prose",
      },
      {
        input: { raw: '{"sentiment": "neutral", "score": "high"}' },
        expected: null,
        description: "the score is a string rather than a number",
      },
      {
        input: { raw: "I was unable to analyse that ticket." },
        expected: null,
        description: "no object in the response at all",
      },
    ],
  },
  practice: {
    id: "py-l5-validate-output-practice",
    executionMode: "single-file",
    prompt: `A nightly job asks a model to tag every support ticket, and the tags feed a dashboard the
support lead reads each morning. Last week one malformed response reached the dashboard and a whole
category of tickets vanished from it for three days. Before the pipeline runs, you now want to know
whether every response in the batch is usable, and which one is not.

Write a function \`first_invalid_index(responses)\` that returns the index of the first response in
the list that fails validation, or \`-1\` when every response is valid.

A response is valid when it contains a JSON object, possibly wrapped in prose, with an \`"id"\` key
holding a positive integer and a \`"tags"\` key holding a list in which every element is a string. An
empty tag list is valid. A boolean counts as an integer in Python, so an \`"id"\` of \`true\` is not
valid. Keep \`first_invalid_index\` as the last function in the file.`,
    starterCode: `import json


def first_invalid_index(responses):
    # Return the index of the first response that fails validation, or -1.
    pass`,
    hints: [
      "Write a helper that validates one response and returns True or False, then loop with `enumerate`.",
      "Check the top-level value is a dict before calling `.get` on it, since valid JSON can be a list.",
      "`all(isinstance(tag, str) for tag in tags)` checks every element, and is `True` for an empty list.",
    ],
    referenceSolution: `import json


def is_valid_response(raw):
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end < start:
        return False
    try:
        data = json.loads(raw[start : end + 1])
    except ValueError:
        return False
    if not isinstance(data, dict):
        return False
    ticket_id = data.get("id")
    tags = data.get("tags")
    if isinstance(ticket_id, bool) or not isinstance(ticket_id, int) or ticket_id <= 0:
        return False
    if not isinstance(tags, list):
        return False
    return all(isinstance(tag, str) for tag in tags)


def first_invalid_index(responses):
    for index, raw in enumerate(responses):
        if not is_valid_response(raw):
            return index
    return -1`,
    testCases: [
      {
        input: {
          responses: ['{"id": 1, "tags": ["billing"]}', '{"id": 2, "tags": []}'],
        },
        expected: -1,
        description: "every response is usable",
      },
      {
        input: {
          responses: ['{"id": 1, "tags": ["a"]}', '{"id": 0, "tags": []}'],
        },
        expected: 1,
        description: "an id that is not positive",
      },
      {
        input: { responses: ['{"id": 3, "tags": "billing"}'] },
        expected: 0,
        description: "tags arrived as a string rather than a list",
      },
      {
        input: {
          responses: ['{"id": 4, "tags": ["a", 5]}', '{"id": 5, "tags": []}'],
        },
        expected: 0,
        description: "one element of the tag list is not a string",
      },
    ],
  },
}

export const level5: PythonLevel = {
  id: 5,
  slug: "verification",
  title: "Level 5: Judging Code You Did Not Write",
  tagline: "Read it, break it, test it, repair it. The review skills that decide what ships.",
  defaultExecutionMode: "single-file",
  estimatedHours: 5,
  modules: [
    {
      id: "py-l5-read-first",
      title: "Read It Before You Run It",
      description:
        "Recover the contract, trace the boundary, and find the input that exposes plausible-looking code.",
      lessons: [traceFirstLesson, happyPathLesson, failureSignaturesLesson],
    },
    {
      id: "py-l5-tests",
      title: "The Test Is the Verification",
      description:
        "Turn a suspicion into an assertion that fails before the fix, using properties and a reference oracle when examples run out.",
      lessons: [failingTestLesson, propertiesLesson, oracleLesson],
    },
    {
      id: "py-l5-repair",
      title: "Debugging Code You Did Not Author",
      description:
        "Shrink the failing input, repair without rewriting, and read a solution for the cost it will have in production.",
      lessons: [shrinkLesson, repairLesson, costLesson],
    },
    {
      id: "py-l5-model-calls",
      title: "Calling a Model Like Any Other Unreliable Dependency",
      description:
        "Wrap the call, validate what comes back, and check the API it used actually exists before any of it reaches production.",
      lessons: [modelDependencyLesson, validateOutputLesson],
    },
  ],
}
