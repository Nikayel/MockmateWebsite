# Workbooks

This folder holds the content for Sprint Labs: real, multi-sprint codebases that learners join
and ship tickets against. Everything in here is data (YAML, Markdown, and plain diff files) --
adding a new workbook, sprint, or ticket never requires touching application code.

- `meridian/` is the flagship workbook (see `docs/sprint-labs/WORKBOOK-SPEC.md` for the pitch).
- `_fixture-workbook/` is a tiny, two-ticket example used only by the automated tests. It is a
  safe, small place to go look at every artifact this README describes, side by side.

This document is the "how do I author a workbook" guide, aimed at someone who is not a
programmer. If you can write a bug report and follow a checklist, you can author a ticket.

## The folder shape

Every workbook follows the same tree:

```
workbooks/<workbook-id>/
  workbook.yaml                     # the workbook's title, pitch, topics, level
  repo/                             # the starting codebase, copied in as-is on day one
  sprints/
    01-some-sprint-name/
      sprint.yaml                   # this sprint's goal, standup line, what changes
      tickets/
        ABC-101/
          ticket.md                 # the ask, written like a real Jira ticket
          setup.diff                # (optional) code changes applied before the ticket starts
          tests/
            visible/                # tests the learner can see and run locally
            hidden/                 # tests the learner never sees (see below)
          reference.diff            # the "correct" solution -- never shown to the learner until they finish
          rubric.yaml                # how this ticket is scored
          review.yaml                # (review-only tickets only) the bot reviewer's comments
          author_brief.yaml         # (review-only tickets only) the reasoning behind that diff
    02-next-sprint/
      ...
```

A workbook can have as many sprints as it needs, and each sprint can have as many tickets as it
needs. `meridian/sprints/01-contracts/tickets/MER-101/` is a real, finished example you can open
right now and use as a template.

## What each file actually is

**`workbook.yaml`** -- the catalog card. Title, one-line pitch, which topics it teaches, how hard
it is, roughly how many hours it takes. This is the only file a learner sees before they enroll.

**`sprint.yaml`** -- the sprint's standup. A goal for the sprint ("by Friday an invalid claim
can't get past the first line of a handler"), a quote from the team's Slack that kicks it off, and
a short list of what the codebase gains or changes this sprint. This is also where a sprint
declares which learning objectives it teaches (see `objectives` below).

**`ticket.md`** -- the actual ask. Written the way a real ticket would be written: a bug report, a
support escalation, a product manager's request. It has two parts:

- A small block of settings at the top (points, labels, which learning objectives it teaches, and
  whether an AI assistant is allowed -- see "AI policy" below).
- Plain-English prose below that: the bug, the ask, the acceptance criteria. **A ticket never lists
  which files to touch.** Figuring out where the problem lives is part of what's being taught, and
  it's the part every other coding exercise skips.

**`setup.diff`** -- a starting-state patch, applied to the codebase before the learner sees the
ticket. Most tickets don't need one (the seed codebase is already the starting state). Use it when
a ticket needs the codebase to be in some specific broken or half-finished shape first.

**`tests/visible/`** -- tests the learner can see and run themselves, as often as they like, while
they work. These are the ticket's stated definition of done -- if the ticket says "a malformed
claim is rejected with a 400," a visible test proves exactly that.

**`tests/hidden/`** -- the tests that make grading real. The learner never sees these files, and
never sees their contents. Each one is a YAML file describing one edge case a careful engineer
would have thought of -- something the visible tests don't cover. After a learner submits, they
find out by name which hidden tests their code failed ("Escaped: a null amount is stored instead
of being rejected"), but never what the test file actually checks. Look at
`meridian/sprints/01-contracts/tickets/MER-101/tests/hidden/rejects-null-amount.yaml` for a real
one.

**`reference.diff`** -- the correct solution, as a diff. It is secret: a learner never sees it
until after they finish the ticket, when it appears next to their own diff at retro. It also has
to actually work -- `lab validate` (below) proves it turns every failing test green.

**`rubric.yaml`** -- how the ticket is scored: how much weight goes to understanding the problem,
solving it, code quality, communication, and verification (did the learner's own tests catch their
own bugs). A short plain-English note next to each weight explains what it's actually keying off.

**`review.yaml`** and **`author_brief.yaml`** -- only used on "review-only" tickets, where an AI
agent already wrote the diff and the learner's job is to decide what ships. `review.yaml` is the
bot reviewer's comments on that diff (one of them is deliberately wrong -- accepting it costs the
learner points, pushing back earns them). `author_brief.yaml` is the reasoning behind the diff,
used so the review comments and the "trap" stay consistent with what was actually written.

## The io-case idea, in one paragraph

Most hidden tests are written as an "io-case": instead of writing test code, you just describe an
input and the exact output a correct solution should produce for it (see any file under
`MER-101/tests/hidden/` for real examples -- each one is just an `input:` and an `expected:`
block). The product runs the learner's own code against that input and checks the result against
your expected value on the server, where the learner's code can never see it. You don't write any
test logic yourself; you just need to name, for one tricky input, what the right answer is.

## Casing rules: some keys are `snake_case`, most are `camelCase`

This trips people up, so it gets its own section. Almost every key you'll write is `camelCase`
(`acceptanceCriteria`, `standupQuote`, `archMapDelta`). A small handful are `snake_case` instead,
because that's what the product spec calls them: `ai_policy`, `ai_policy_reason`, and
`concession_triggers`. If you use the wrong casing, `lab validate` (below) stops you with an error
naming the exact key it expected -- it never just silently drops your field. The full, current list
lives in `docs/sprint-labs/AUTHORING-RULES.md` §1; check there if you're ever unsure about one key.

## AI policy: who's allowed to use an assistant on this ticket

Every `ticket.md` declares one of three settings, and it changes what the learner is given, not
just a suggestion:

- `assisted` -- most tickets. The learner gets a full AI assistant.
- `unassisted` -- no assistant at all. The ticket has to say, in its own voice, why this one is
  hands-only (`ai_policy_reason`).
- `review-only` -- an assistant already wrote the diff. The learner's job is entirely to review it.

## Checking your work: `lab validate`

Before you consider a ticket done, run:

```
pnpm lab:validate workbooks/<workbook-id>
```

This is the fast check: it makes sure every required file is there, every key is spelled and cased
correctly, every ticket maps to a real learning objective, and nothing that should be secret (a
hidden test's contents, `reference.diff`, `review.yaml`) could leak into what a learner receives.

Once you've written a `reference.diff`, also run the slower, thorough check:

```
pnpm lab:validate:dynamic workbooks/<workbook-id>
```

This one actually applies your diffs and runs your tests for real. It proves your ticket goes
"red, then green": with just `setup.diff` applied, the visible and hidden tests genuinely fail;
with `reference.diff` on top, they genuinely pass. It also proves nothing a learner isn't supposed
to see (a later ticket's answer, another ticket's hidden-test name) ends up in the files a learner
actually receives. If either command fails, it tells you exactly which ticket and which file, so
you always know precisely what to fix.

`pnpm sprint-labs:dev` runs both checks for a whole workbook in one go and tells you what's left
to do -- a good first command to run after making any change.

## Where to look for a real, working example

Don't start from a blank file. Copy the shape of an existing ticket:

- `workbooks/meridian/sprints/01-contracts/tickets/MER-101/` -- a complete, real, currently-passing
  `assisted` ticket: a bug report, four hidden io-cases, a reference diff, a rubric.
- `workbooks/_fixture-workbook/sprints/01-foundations/tickets/DEMO-102/` -- a small `review-only`
  example, showing `review.yaml` and `author_brief.yaml` in their smallest useful form.
