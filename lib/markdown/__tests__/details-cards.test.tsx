/**
 * The whitelisted <details>/<summary> accordion through the EXACT lesson pipeline.
 * The transform must render the authored shape as a native details card, leave the
 * body markdown fully rendered inside it, and refuse (fail-open to skipped HTML,
 * never half-render) anything outside the exact shape.
 */
import { describe, it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ReactMarkdown from "react-markdown"
import { preprocessAsciiArt, markdownComponents, lessonRemarkPlugins } from "@/lib/markdown"

function render(content: string): string {
  return renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      { remarkPlugins: lessonRemarkPlugins as never, components: markdownComponents },
      preprocessAsciiArt(content)
    )
  )
}

const card = (title: string, body: string) =>
  `<details>\n<summary>${title}</summary>\n\n${body}\n\n</details>`

describe("details-card accordion", () => {
  it("renders the authored shape as a native details/summary card", () => {
    const html = render(card("Latency ladder", "L1 cache: about 1ns.\n\n- disk seek: 10ms"))
    expect(html).toContain("<details")
    expect(html).toContain("<summary")
    expect(html).toContain("Latency ladder")
    // Body markdown renders INSIDE the card (list becomes a real list).
    expect(html).toContain("<li>disk seek: 10ms</li>")
  })

  it("renders multiple sibling cards independently", () => {
    const html = render(card("One", "first body") + "\n\n" + card("Two", "second body"))
    expect(html.match(/<details/g)?.length).toBe(2)
    expect(html).toContain("One")
    expect(html).toContain("Two")
    expect(html).toContain("first body")
    expect(html).toContain("second body")
  })

  it("keeps prose around the cards intact", () => {
    const html = render("Before the card.\n\n" + card("Middle", "inside") + "\n\nAfter the card.")
    expect(html).toContain("Before the card.")
    expect(html).toContain("After the card.")
  })

  it("renders GFM tables inside a card", () => {
    const table = "| op | cost |\n|---|---|\n| L1 | 1ns |"
    const html = render(card("Costs", table))
    expect(html).toContain("<table")
    expect(html).toContain("1ns")
  })

  it("leaves an unclosed details block untouched (skipped, not half-rendered)", () => {
    const html = render("<details>\n<summary>Broken</summary>\n\nno close tag here")
    expect(html).not.toContain("<details")
    // The body paragraph still renders as ordinary markdown.
    expect(html).toContain("no close tag here")
  })

  it("does not transform arbitrary raw HTML (whitelist only)", () => {
    const html = render('<div class="x">raw</div>\n\n<script>alert(1)</script>')
    expect(html).not.toContain("<div class")
    expect(html).not.toContain("<script")
  })
})

describe("reference-sheet lessons render as accordions (Iteration 3 exit criteria)", () => {
  it.each([
    { lessonId: "sd-l0-latency-numbers", minCards: 3 },
    { lessonId: "sd-l0-template-pitfalls", minCards: 6 },
  ])("$lessonId renders at least $minCards cards", async ({ lessonId, minCards }) => {
    const { getSystemDesignLesson } = await import("@/lib/tutorials/system-design/registry")
    const lesson = getSystemDesignLesson(lessonId)
    expect(lesson).toBeDefined()
    const html = render(lesson!.teach.markdown)
    expect(html.match(/<details/g)?.length ?? 0).toBeGreaterThanOrEqual(minCards)
    // No half-rendered leftovers: the raw tags were all consumed by the transform.
    expect(html).not.toContain("&lt;details&gt;")
    expect(html).not.toContain("&lt;/details&gt;")
  })
})
