import { describe, it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { preprocessAsciiArt, markdownComponents, remarkNoIndentedCode } from "../markdown"

/**
 * End-to-end guard for the /learn table-rendering bug: a GFM table in lesson prose
 * must render as a real <table> through the exact MarkdownRenderer pipeline
 * (preprocess -> remark-gfm -> shared components), not as a fenced code block with
 * the body collapsed into one soft-wrapped paragraph.
 */
function renderLikeMarkdownRenderer(content: string): string {
  return renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      {
        remarkPlugins: [remarkGfm, remarkNoIndentedCode] as never,
        components: markdownComponents,
      },
      preprocessAsciiArt(content)
    )
  )
}

const rankingTable = [
  "| product | revenue | rn (ROW_NUMBER) | rnk (RANK) | dense (DENSE_RANK) |",
  "|---|---|---|---|---|",
  "| Earbuds | 500 | 1 | 1 | 1 |",
  "| Headphones | 500 | 2 | 1 | 1 |",
  "| Speaker | 300 | 3 | **3** | **2** |",
  "| Cable | 100 | 4 | 4 | 3 |",
].join("\n")

describe("markdown table rendering (MarkdownRenderer pipeline)", () => {
  it("renders a GFM comparison table as a real <table>", () => {
    const html = renderLikeMarkdownRenderer(rankingTable)
    expect(html).toContain("<table")
    expect(html).toContain("<thead")
    expect(html).toContain("<th")
    expect(html).toContain("<td")
    // Every data row becomes its own <tr>: header + 4 body rows = 5 <tr>.
    expect(html.match(/<tr/g)?.length).toBe(5)
  })

  it("does not fence the delimiter row as a code block", () => {
    const html = renderLikeMarkdownRenderer(rankingTable)
    expect(html).not.toContain("|---|")
    expect(html).not.toContain("<pre")
  })

  it("keeps inline markdown (bold) inside cells", () => {
    const html = renderLikeMarkdownRenderer(rankingTable)
    // Speaker's RANK cell is **3** -> must be a <strong>, proving cell content is parsed.
    expect(html).toContain("<strong")
  })
})
