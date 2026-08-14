// @vitest-environment jsdom
/**
 * `supplied` material must never enter the learner's answer buffer.
 *
 * ## The failure this pins, and why it is quiet
 *
 * The AI-resistant exercise genres (critique a flawed design, diagnose an incident from symptoms)
 * all need to hand the learner an artifact to work ON. The obvious place to put it is
 * `starterAnswer`, and that is wrong in a way nothing would report: `starterAnswer` is editable
 * SEED TEXT, so a flawed design placed there lands inside the learner's own saved answer. Their
 * critique and the thing being critiqued share one buffer, the saved record of their work is mostly
 * someone else's prose, and Reset silently restores the flawed design over whatever they wrote.
 *
 * Nothing throws. No test goes red. The learner just ends up grading text they did not write. That
 * is exactly the class of defect that needs an assertion rather than a comment, so this file exists
 * before any lesson authors a `supplied` block.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DesignAnswerPanel } from "../DesignAnswerPanel"
import { toPublicLessonPreview } from "@/lib/tutorials/public-preview"
import type { DesignExercise } from "@/lib/tutorials/types"

afterEach(cleanup)

const FLAWED_DESIGN = [
  "## Proposed design",
  "",
  "- Every write goes to a single Postgres primary in us-east-1.",
  "- Reads are served from five read replicas, one per region.",
  "- The mobile client writes, then immediately reads back to confirm.",
].join("\n")

const CRITIQUE_EXERCISE: DesignExercise = {
  id: "sd-l3-read-replicas-apply",
  prompt: "Review the design below and name the strongest objection you would raise.",
  thinkAbout: ["What does the client see immediately after it writes?"],
  modelAnswerOutline: ["Read-your-writes is broken by the replica read path."],
  supplied: { label: "Proposed design", body: FLAWED_DESIGN },
}

function renderPanel(exercise: DesignExercise, answer = "") {
  const onAnswerChange = vi.fn()
  const view = render(
    <DesignAnswerPanel
      exercise={exercise}
      answer={answer}
      onAnswerChange={onAnswerChange}
      hasSaved={false}
    />
  )
  return { onAnswerChange, ...view }
}

describe("supplied material stays out of the answer buffer", () => {
  it("renders the supplied artifact where the learner can read it", () => {
    renderPanel(CRITIQUE_EXERCISE)
    // Queried by its accessible name rather than by text: "Proposed design" legitimately
    // appears twice, once as the section label and once as the artifact's own heading, and
    // getByText would fail on the ambiguity rather than on anything being wrong.
    expect(screen.getByRole("region", { name: "Proposed design" })).toBeTruthy()
    expect(screen.getByText(/single Postgres primary/)).toBeTruthy()
  })

  it("labels it read only, so the learner is not hunting for an edit affordance", () => {
    renderPanel(CRITIQUE_EXERCISE)
    expect(screen.getByText(/read only/i)).toBeTruthy()
  })

  it("never seeds the editor with it", () => {
    // The whole point. The textarea starts empty because the exercise supplies no
    // `starterAnswer`, regardless of how much `supplied` material there is.
    const { container } = renderPanel(CRITIQUE_EXERCISE)
    const textarea = container.querySelector("textarea")
    expect(textarea).toBeTruthy()
    expect(textarea!.value).toBe("")
    expect(textarea!.value).not.toContain("Postgres")
  })

  it("does not restore it on Reset", () => {
    // The subtle half: even if the editor starts clean, a Reset that pulled from `supplied`
    // would overwrite the learner's work with the artifact.
    const { onAnswerChange, container } = renderPanel(CRITIQUE_EXERCISE, "my critique so far")
    const reset = Array.from(container.querySelectorAll("button")).find((b) =>
      /reset/i.test(b.getAttribute("aria-label") ?? b.textContent ?? "")
    )
    expect(reset, "the panel should offer a Reset control").toBeTruthy()
    fireEvent.click(reset!)
    for (const call of onAnswerChange.mock.calls) {
      expect(String(call[0])).not.toContain("Postgres")
    }
  })

  it("keeps supplied and starterAnswer as separate channels", () => {
    // An exercise may legitimately have both: a scaffold to fill in AND an artifact to read.
    const withBoth: DesignExercise = { ...CRITIQUE_EXERCISE, starterAnswer: "## My objection\n\n" }
    const { container } = renderPanel(withBoth, "## My objection\n\n")
    const textarea = container.querySelector("textarea")!
    expect(textarea.value).toBe("## My objection\n\n")
    expect(textarea.value).not.toContain("Postgres")
  })
})

describe("supplied material is published as question material", () => {
  it("survives the public projection", () => {
    // A signed-out reader who sees "Review the design below" and no design is reading broken
    // copy. It is question material, exactly like `prompt` and `thinkAbout`.
    const preview = toPublicLessonPreview({
      courseId: "system-design",
      level: {
        id: 3,
        slug: "scaling-data",
        title: "Scaling data",
        tagline: "t",
        modules: [],
      } as never,
      lesson: {
        id: "sd-l3-read-replicas",
        title: "Read replicas",
        summary: "s",
        estimatedMinutes: 10,
        difficulty: "medium",
        skills: ["replication"],
        teach: { markdown: "body", estimatedMinutes: 8 },
        apply: CRITIQUE_EXERCISE,
        practice: CRITIQUE_EXERCISE,
      } as never,
    })
    expect(preview.apply.supplied?.label).toBe("Proposed design")
    expect(preview.apply.supplied?.body).toContain("single Postgres primary")
  })

  it("still gates the model answer that goes with it", () => {
    // Publishing the question must not drag the answer along with it.
    const preview = toPublicLessonPreview({
      courseId: "system-design",
      level: { id: 3, slug: "scaling-data", title: "T", tagline: "t", modules: [] } as never,
      lesson: {
        id: "sd-l3-read-replicas",
        title: "Read replicas",
        summary: "s",
        estimatedMinutes: 10,
        difficulty: "medium",
        skills: ["replication"],
        teach: { markdown: "body", estimatedMinutes: 8 },
        apply: CRITIQUE_EXERCISE,
        practice: CRITIQUE_EXERCISE,
      } as never,
    })
    expect(JSON.stringify(preview)).not.toContain("Read-your-writes is broken")
  })
})
