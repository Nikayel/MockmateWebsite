import { fn, k, num, p, s, type CodeLine } from "@/components/tutorials/CodeWindow"

/**
 * Content for the post-hero "Gap" section (HANDOFF-GapSection.md, option 16a).
 *
 * One object per ticket — everything the workspace renders (header, code,
 * ticket metadata, chat, copilot) reads from here. The handoff's own
 * retrospective (§6) names four separate bugs that came from hand-authoring
 * one of these pieces (a diff, a chat line, a badge) separately from the rest
 * and letting it drift from the ticket underneath it. Keeping it one object
 * per ticket, with the buggy line *derived* from the diff rather than
 * indexed, makes that class of bug structurally impossible here.
 */

export type DiffLine = readonly ["+" | "-", string]

export interface GapChatMessage {
  who: "sparra" | "you"
  time: string
  text: string
  /** Present only on spoken turns — renders the mic tag + duration. */
  spokenFor?: string
}

export interface GapTicket {
  id: string
  n: number
  title: string
  reporter: string
  opened: string
  repro: string
  access: string
  body: string
  file: string
  crumb: string
  src: CodeLine[]
  testName: string
  testFail: string
  expected: string
  received: string
  clockSeconds: number
  chat: GapChatMessage[]
  /** Sparra's open question, pinned at the bottom of the rail — not yet answered. */
  pending: string
  copilotBlurb: string
  diff: DiffLine[]
}

/** Flattens a code line's tokens back to plain text, whitespace-collapsed. */
function normalizeLine(line: CodeLine): string {
  return line
    .map((t) => t.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * The buggy line, derived by matching the diff's removed line against the
 * source — never a hardcoded index. This is the fix for the recurring bug
 * in §6: a `bad: 4` index kept pointing at the wrong line once a ticket's
 * source changed shape. If nothing matches, highlighting nothing (-1) is
 * safer than highlighting the wrong line.
 */
export function deriveBadLineIndex(src: CodeLine[], diff: DiffLine[]): number {
  const removed = diff.find(([op]) => op === "-")
  if (!removed) return -1
  const target = removed[1].replace(/\s+/g, " ").trim()
  return src.findIndex((line) => normalizeLine(line) === target)
}

export const GAP_TICKETS: GapTicket[] = [
  {
    id: "TICKET-4417",
    n: 1,
    title: "Billing rollup double-counts retried events",
    reporter: "billing-ops",
    opened: "3h ago, before the next billing run",
    repro: "— none provided",
    access: "3 files, none of them yours",
    body: "Finance flagged accounts where the monthly total looks inflated. I could not reproduce it on my machine — the numbers only drift on accounts with retried billing events.",
    file: "rollup.js",
    crumb: "src / billing",
    src: [
      [k("export "), k("function "), fn("rollup"), p("(events) {")],
      [p("  const totals = "), k("new "), fn("Map"), p("()")],
      [p("  const seen = "), k("new "), fn("Set"), p("()")],
      [k("  for "), p("("), k("const "), p("e "), k("of "), p("events) {")],
      [p("    const id = e.accountId")],
      [p("    const prev = totals.get(id) ?? "), num("0")],
      [p("    totals.set(id, prev + e.units)")],
      [p("  }")],
      [k("  return "), p("totals")],
      [p("}")],
    ],
    testName: "rollup.test.js › sums units per account",
    testFail: "bills each event id",
    expected: "1240",
    received: "1980",
    clockSeconds: 49 * 60 + 12,
    chat: [
      {
        who: "sparra",
        time: "10:02",
        text: "Which accounts does this touch, and can the same billing event ever arrive twice?",
      },
      {
        who: "you",
        time: "10:03",
        text: "Billing retries on timeout, so the same event can land twice with the same event id.",
        spokenFor: "00:41",
      },
    ],
    pending: "Why a Set to catch that, and not a DISTINCT in the query?",
    copilotBlurb: "Copilot proposes deduping retried events by id before they hit the rollup.",
    diff: [
      ["-", "totals.set(id, prev + e.units)"],
      ["+", "if (seen.has(e.id)) continue"],
      ["+", "seen.add(e.id)"],
      ["+", "totals.set(id, prev + e.units)"],
    ],
  },
  {
    id: "TICKET-4482",
    n: 2,
    title: "Password reset emails arrive twice",
    reporter: "support",
    opened: "1h ago, two users reported duplicate resets",
    repro: "— intermittent, only under retry",
    access: "2 files, none of them yours",
    body: "Two users say they got the reset email twice within a second of each other. Nothing in the logs points at a bug in the template.",
    file: "reset-mailer.js",
    crumb: "src / auth",
    src: [
      [k("export "), k("async "), k("function "), fn("sendResetEmail"), p("(user) {")],
      [p("  const token = "), k("await "), fn("issueToken"), p("(user)")],
      [p("  "), k("await "), p("mailer.send({")],
      [p("    to: user.email,")],
      [p("    template: "), s('"password-reset"'), p(",")],
      [p("    token,")],
      [p("  })")],
      [p("}")],
    ],
    testName: "reset-mailer.test.js › sends exactly one email per request",
    testFail: "duplicate send on retry",
    expected: "1",
    received: "2",
    clockSeconds: 46 * 60 + 3,
    chat: [
      {
        who: "sparra",
        time: "11:14",
        text: "Walk me through what happens if two workers pick up the same retry at the same time.",
      },
      {
        who: "you",
        time: "11:15",
        text: "Both call issueToken, both mint a valid token, both send. Nothing stops the second one.",
        spokenFor: "00:58",
      },
    ],
    pending: "Does an idempotency key alone stop that, or do you still need a lock?",
    copilotBlurb: "Copilot proposes keying token issuance off the request, not the user.",
    diff: [
      ["-", "const token = await issueToken(user)"],
      ["+", "const idempotencyKey = requestId ?? crypto.randomUUID()"],
      ["+", "const token = await issueToken(user, { idempotencyKey })"],
    ],
  },
]

/** The collapsed screening-round strip's carousel — code the AI clears in seconds. */
export interface ScreeningSlide {
  filename: string
  lines: CodeLine[]
}

export const SCREENING_SLIDES: ScreeningSlide[] = [
  {
    filename: "two-sum.py",
    lines: [
      [k("def "), fn("two_sum"), p("(nums, target):")],
      [p("    seen = {}")],
      [k("    for "), p("i, n "), k("in "), fn("enumerate"), p("(nums):")],
      [k("        if "), p("target - n "), k("in "), p("seen:")],
      [k("            return "), p("[seen[target - n], i]")],
      [p("        seen[n] = i")],
    ],
  },
  {
    filename: "invert-tree.py",
    lines: [
      [k("def "), fn("invert_tree"), p("(root):")],
      [k("    if not "), p("root:")],
      [k("        return "), k("None")],
      [
        p("    root.left, root.right = "),
        fn("invert_tree"),
        p("(root.right), "),
        fn("invert_tree"),
        p("(root.left)"),
      ],
      [k("    return "), p("root")],
    ],
  },
  {
    filename: "window-max.py",
    lines: [
      [k("from "), p("collections "), k("import "), p("deque")],
      [k("def "), fn("window_max"), p("(nums, k):")],
      [p("    dq, out = "), fn("deque"), p("(), []")],
      [k("    for "), p("i, n "), k("in "), fn("enumerate"), p("(nums):")],
      [k("        while "), p("dq "), k("and "), p("nums[dq[-1]] <= n:")],
      [p("            dq.pop()")],
      [p("        dq.append(i)")],
      [k("        if "), p("dq[0] <= i - k:")],
      [p("            dq.popleft()")],
      [k("        if "), p("i >= k - "), num("1"), p(":")],
      [p("            out.append(nums[dq[0]])")],
      [k("    return "), p("out")],
    ],
  },
]
