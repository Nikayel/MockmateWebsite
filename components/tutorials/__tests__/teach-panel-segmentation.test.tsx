/**
 * TeachPanel's opt-in progressive disclosure (the code courses' half of the pacing
 * the System Design player already had).
 *
 * The property that matters most here is the OPT-OUT: `lessonId` is optional, and a
 * call site that has not passed it must render byte-for-byte what it rendered before
 * segmentation existed. Everything else is the same contract SegmentedTeachPanel has:
 * a long teach shows one segment plus a part counter, a short teach renders whole,
 * and a completed teach never re-gates.
 *
 * Server render only, matching segmented-teach-panel.test.tsx: click-to-reveal, focus
 * movement, and persistence are client behavior.
 */
import { describe, it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { TeachPanel } from "../TeachPanel"

const para = (words: number, tag: string) => Array.from({ length: words }, () => tag).join(" ")

/** 3 x 400 words: the engine packs one section per segment, so the counter reads 3. */
const longMarkdown = [
  `## Alpha section\n\n${para(400, "alpha")}`,
  `## Beta section\n\n${para(400, "beta")}`,
  `## Gamma section\n\n${para(400, "gamma")}`,
].join("\n\n")

const shortMarkdown = `## Only section\n\n${para(120, "solo")}`

function render(props: Partial<Parameters<typeof TeachPanel>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(TeachPanel, {
      teach: { markdown: longMarkdown },
      onContinue: () => {},
      ...props,
    } as Parameters<typeof TeachPanel>[0])
  )
}

describe("TeachPanel progressive disclosure", () => {
  // The regression guard: SQL and any other caller that has not opted in must be
  // completely unaffected by segmentation existing at all.
  it("renders a long teach whole when lessonId is omitted", () => {
    const html = render()
    expect(html).toContain("alpha")
    expect(html).toContain("beta")
    expect(html).toContain("gamma")
    expect(html).not.toContain("Part 1 of")
  })

  it("keeps the demo block and hand-off visible for a non-opted-in caller", () => {
    const html = render({ teach: { markdown: longMarkdown, demoCode: "print('hi')" } })
    expect(html).toContain("Live example")
    expect(html).toContain("let me try")
  })

  it("reveals only the first segment once opted in", () => {
    const html = render({ lessonId: "py-l2-test" })
    expect(html).toContain("alpha")
    expect(html).not.toContain("beta")
    expect(html).not.toContain("gamma")
    expect(html).toContain("Part 1 of 3")
  })

  // The demo is the worked example that concludes the teach, so it must not appear
  // beside segment 1 where it would give away the sections still hidden.
  it("holds the demo block back until every segment is revealed", () => {
    const html = render({
      lessonId: "py-l2-test",
      teach: { markdown: longMarkdown, demoCode: "print('hi')" },
    })
    expect(html).not.toContain("Live example")
    expect(html).not.toContain("let me try")
  })

  it("renders a short teach whole even when opted in", () => {
    const html = render({ lessonId: "py-l1-test", teach: { markdown: shortMarkdown } })
    expect(html).toContain("solo")
    expect(html).not.toContain("Part 1 of")
    expect(html).toContain("let me try")
  })

  it("never re-gates a completed teach", () => {
    const html = render({ lessonId: "py-l2-test", teachCompleted: true })
    expect(html).toContain("alpha")
    expect(html).toContain("beta")
    expect(html).toContain("gamma")
    expect(html).not.toContain("Part 1 of")
    expect(html).toContain("let me try")
  })
})
