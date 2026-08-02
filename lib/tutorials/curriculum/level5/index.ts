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
  ],
}
