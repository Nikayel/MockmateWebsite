/**
 * Prompt standard enforcement — the centralized guardrail behind docs/curriculum/PROMPT-STANDARD.md.
 * It walks EVERY Apply / Practice / Drill prompt across the Python, SQL, and System Design curricula
 * and asserts the mechanical rules of the standard, so a new question that regresses them fails
 * `pnpm test`. (System Design never renders its Practice exercise, but the prompt still ships in the
 * bundle and must meet the standard.)
 *
 * Only the mechanical rules live here (no em dash, no bidirectional arrow, no vague framing opener,
 * non-empty prompt, SQL drills tagged by difficulty). The judgment rule — "lead with the deliverable"
 * — is not machine-checkable and is enforced by review against the standard doc. Keep VAGUE_OPENERS
 * and the doc's opener blocklist in sync.
 */
import { describe, it, expect } from "vitest"
import { listAllLessons } from "../registry"
import { listAllSqlLessons } from "../sql/registry"
import { listAllSystemDesignLessons } from "../system-design/registry"

type Course = "python" | "sql" | "system-design"
type Phase = "apply" | "practice" | "drill"
interface PromptRef {
  course: Course
  lessonId: string
  phase: Phase
  id: string
  prompt: string
}

function collectPrompts(): PromptRef[] {
  const refs: PromptRef[] = []
  const add = (
    course: Course,
    lessonId: string,
    phase: Phase,
    ex?: { id: string; prompt: string }
  ) => {
    if (ex) refs.push({ course, lessonId, phase, id: ex.id, prompt: ex.prompt })
  }
  for (const lesson of listAllLessons()) {
    add("python", lesson.id, "apply", lesson.apply)
    add("python", lesson.id, "practice", lesson.practice)
    for (const drill of lesson.extraPractice ?? []) add("python", lesson.id, "drill", drill)
  }
  for (const lesson of listAllSqlLessons()) {
    add("sql", lesson.id, "apply", lesson.apply)
    add("sql", lesson.id, "practice", lesson.practice)
    for (const drill of lesson.extraPractice ?? []) add("sql", lesson.id, "drill", drill)
  }
  for (const lesson of listAllSystemDesignLessons()) {
    add("system-design", lesson.id, "apply", lesson.apply)
    add("system-design", lesson.id, "practice", lesson.practice)
  }
  return refs
}

const PROMPTS = collectPrompts()
const label = (r: PromptRef) => `${r.course}/${r.lessonId}/${r.phase} (${r.id})`

// Framing verbs that describe the solution's shape instead of the task. Prompts must lead with the
// deliverable. Extend this together with docs/curriculum/PROMPT-STANDARD.md when a new offender shows.
const VAGUE_OPENERS = ["Author", "Model", "Assemble", "Reconcile", "Wire"]
// Optional leading difficulty tag (drills) before the first real word.
const LEADING_TAG = "^\\s*(?:\\*\\*(?:Easy|Medium|Hard)\\.\\*\\*\\s*)?"

const EM_DASH = "—"
const BIDIR_ARROW = "↔"

describe("exercise prompt standard (docs/curriculum/PROMPT-STANDARD.md)", () => {
  it("finds every Apply/Practice/Drill prompt across both curricula", () => {
    expect(PROMPTS.length).toBeGreaterThan(100)
    expect(PROMPTS.some((r) => r.course === "python")).toBe(true)
    expect(PROMPTS.some((r) => r.course === "sql")).toBe(true)
    expect(PROMPTS.some((r) => r.course === "system-design")).toBe(true)
  })

  it("no prompt is empty or trivially short", () => {
    const bad = PROMPTS.filter((r) => typeof r.prompt !== "string" || r.prompt.trim().length < 20)
    expect(bad.map(label), "prompt missing or too short").toEqual([])
  })

  it("no prompt contains an em dash (use plain punctuation)", () => {
    const bad = PROMPTS.filter((r) => r.prompt.includes(EM_DASH))
    expect(bad.map(label), `em dash (${EM_DASH}) found; use periods/commas`).toEqual([])
  })

  it("no prompt contains a bidirectional arrow (write the relationship out)", () => {
    const bad = PROMPTS.filter((r) => r.prompt.includes(BIDIR_ARROW))
    expect(bad.map(label), `${BIDIR_ARROW} found; say "many-to-many"`).toEqual([])
  })

  it("no prompt leads with a vague framing verb", () => {
    const re = new RegExp(`${LEADING_TAG}(?:${VAGUE_OPENERS.join("|")})\\b`, "i")
    const bad = PROMPTS.filter((r) => re.test(r.prompt))
    expect(
      bad.map(label),
      `lead with the deliverable ("Write a query that returns...") not ${VAGUE_OPENERS.join("/")}`
    ).toEqual([])
  })

  it("SQL drills lead with a difficulty tag", () => {
    const re = /^\*\*(Easy|Medium|Hard)\.\*\*/
    const bad = PROMPTS.filter(
      (r) => r.course === "sql" && r.phase === "drill" && !re.test(r.prompt)
    )
    expect(
      bad.map(label),
      "SQL drill prompts must open with **Easy.** / **Medium.** / **Hard.**"
    ).toEqual([])
  })
})
