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
      lessons: [traceFirstLesson],
    },
  ],
}
