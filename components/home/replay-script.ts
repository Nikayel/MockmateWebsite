/**
 * Scripted session replay: the data and the reducer, no rendering.
 *
 * The homepage needs to show the one thing the product claims ("an AI
 * interviewer that reacts as you work") without spending an LLM token or
 * shipping a video. There is no recorded transcript to replay (the /samples
 * pages are hand-written prose), so this is an AUTHORED, representative
 * session and every surface that renders it labels it "Scripted demo".
 *
 * The script is a flat timeline of steps; `computeReplayState(steps, upto)`
 * folds them into a render state. Keeping the fold pure means the player is
 * just an index that advances on a timer, chapter jumps are "set the index",
 * and the end state is testable without a DOM.
 */

export type ReplayStep =
  | {
      kind: "chat"
      role: "interviewer" | "candidate"
      text: string
      chapter?: string
      delayMs: number
    }
  | { kind: "code"; lines: string[]; highlight?: number[]; chapter?: string; delayMs: number }
  | {
      kind: "tests"
      results: { name: string; pass: boolean; detail?: string }[]
      chapter?: string
      delayMs: number
    }
  | {
      kind: "score"
      entries: { label: string; value: number }[]
      chapter?: string
      delayMs: number
    }

export interface ReplayState {
  messages: { role: "interviewer" | "candidate"; text: string }[]
  codeLines: string[]
  highlight: number[]
  tests: { name: string; pass: boolean; detail?: string }[] | null
  score: { label: string; value: number }[] | null
}

export function computeReplayState(steps: ReplayStep[], upto: number): ReplayState {
  const state: ReplayState = {
    messages: [],
    codeLines: [],
    highlight: [],
    tests: null,
    score: null,
  }
  for (let i = 0; i <= Math.min(upto, steps.length - 1); i++) {
    const step = steps[i]
    if (step.kind === "chat") state.messages.push({ role: step.role, text: step.text })
    if (step.kind === "code") {
      state.codeLines = step.lines
      state.highlight = step.highlight ?? []
    }
    if (step.kind === "tests") state.tests = step.results
    if (step.kind === "score") state.score = step.entries
  }
  return state
}

/** Chapter markers, in timeline order, for the full player's scrubber. */
export function replayChapters(steps: ReplayStep[]): { label: string; index: number }[] {
  return steps.flatMap((step, index) => (step.chapter ? [{ label: step.chapter, index }] : []))
}

const BUGGY_CODE = [
  "def two_sum(nums, target):",
  "    seen = {}",
  "    for i, n in enumerate(nums):",
  "        seen[n] = i",
  "        if target - n in seen:",
  "            return [seen[target - n], i]",
  "    return []",
]

const FIXED_CODE = [
  "def two_sum(nums, target):",
  "    seen = {}",
  "    for i, n in enumerate(nums):",
  "        if target - n in seen:",
  "            return [seen[target - n], i]",
  "        seen[n] = i",
  "    return []",
]

/**
 * The authored session. Two Sum is deliberate: instantly recognizable, small
 * enough to read in a 480px pane, and its classic insert-before-check bug
 * gives the interviewer a real moment of reacting to the candidate's code,
 * which is the entire point of the demo.
 */
export const REPLAY_SCRIPT: ReplayStep[] = [
  {
    kind: "chat",
    role: "interviewer",
    chapter: "Clarify",
    delayMs: 0,
    text: "Array of prices, one target. Return the indices of the two entries that sum to it. Before you code, what do you want to ask?",
  },
  {
    kind: "chat",
    role: "candidate",
    delayMs: 2100,
    text: "Is there always exactly one valid pair, and can I use the same index twice?",
  },
  {
    kind: "chat",
    role: "interviewer",
    delayMs: 1900,
    text: "Exactly one pair, and no reusing an index.",
  },
  {
    kind: "chat",
    role: "candidate",
    chapter: "Approach",
    delayMs: 2000,
    text: "Brute force checks every pair, O(n squared). A map from value to index gets it in one pass, O(n) time, O(n) space.",
  },
  { kind: "chat", role: "interviewer", delayMs: 1700, text: "Take the one-pass route." },
  {
    kind: "code",
    chapter: "Code",
    delayMs: 1600,
    lines: BUGGY_CODE.slice(0, 3),
  },
  { kind: "code", delayMs: 1500, lines: BUGGY_CODE },
  {
    kind: "tests",
    chapter: "Bug caught",
    delayMs: 1700,
    results: [
      { name: "[2,7,11,15], 9", pass: true },
      { name: "[3,2,4], 6", pass: false, detail: "expected [1,2], got [0,0]" },
      { name: "[3,3], 6", pass: false, detail: "expected [0,1], got [0,0]" },
    ],
  },
  {
    kind: "chat",
    role: "interviewer",
    delayMs: 1600,
    text: "Trace [3,2,4] with target 6: you insert nums[i] before you look for the complement, so 3 pairs with itself. Which line moves?",
  },
  {
    kind: "code",
    chapter: "Fix",
    delayMs: 2300,
    lines: FIXED_CODE,
    highlight: [3, 4, 5],
  },
  {
    kind: "tests",
    chapter: "Tests pass",
    delayMs: 1500,
    results: [
      { name: "[2,7,11,15], 9", pass: true },
      { name: "[3,2,4], 6", pass: true },
      { name: "[3,3], 6", pass: true },
    ],
  },
  {
    kind: "chat",
    role: "interviewer",
    delayMs: 1500,
    text: "Good. What did the fix cost you, and when would you not take this trade?",
  },
  {
    kind: "chat",
    role: "candidate",
    delayMs: 2100,
    text: "Nothing extra, still O(n) space for the map. If the array were sorted I would use two pointers and drop to O(1) space.",
  },
  {
    kind: "score",
    chapter: "Score",
    delayMs: 2000,
    entries: [
      { label: "Communication", value: 88 },
      { label: "Problem solving", value: 85 },
      { label: "Code quality", value: 90 },
    ],
  },
]
