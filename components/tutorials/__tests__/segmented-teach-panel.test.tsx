/**
 * SSR-safety + shape guards for the progressive-disclosure Read phase. Interaction
 * (click-to-reveal, focus movement, persistence) is client behavior; what must hold
 * at server render: exactly the first segment of a long teach is visible with the
 * Continue affordance and part counter, a short teach renders whole with the
 * hand-off button, and a completed teach renders fully revealed.
 */
import { describe, it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { SegmentedTeachPanel } from "../SegmentedTeachPanel"

const para = (words: number, tag: string) => Array.from({ length: words }, () => tag).join(" ")

// 3 x 400 words: the engine's ~400-word target packs this as exactly one section
// per segment, so the part counter reads 3 and only Alpha is revealed at first.
const longTeach = {
  markdown: [
    `## Alpha section\n\n${para(400, "alpha")}`,
    `## Beta section\n\n${para(400, "beta")}`,
    `## Gamma section\n\n${para(400, "gamma")}`,
  ].join("\n\n"),
}

const shortTeach = { markdown: `## Only section\n\n${para(120, "solo")}` }

function render(props: Partial<Parameters<typeof SegmentedTeachPanel>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(SegmentedTeachPanel, {
      lessonId: "sd-test-lesson",
      teach: longTeach,
      teachCompleted: false,
      onContinue: () => {},
      ...props,
    })
  )
}

describe("SegmentedTeachPanel (server render)", () => {
  it("shows only the first segment of a long teach, with Continue and the part counter", () => {
    const html = render()
    expect(html).toContain("Alpha section")
    expect(html).not.toContain("Beta section")
    expect(html).not.toContain("Gamma section")
    expect(html).toContain("Continue")
    expect(html).toContain("Part 1 of 3")
    expect(html).not.toContain("I&#x27;ve got it")
  })

  it("renders a short teach whole with the hand-off button and no part counter", () => {
    const html = render({ teach: shortTeach })
    expect(html).toContain("Only section")
    expect(html).toContain("I&#x27;ve got it")
    expect(html).not.toContain("Part 1 of")
  })

  it("renders a completed teach fully revealed with the hand-off button", () => {
    const html = render({ teachCompleted: true })
    expect(html).toContain("Alpha section")
    expect(html).toContain("Beta section")
    expect(html).toContain("Gamma section")
    expect(html).toContain("I&#x27;ve got it")
    expect(html).not.toContain(">Continue<")
  })
})
