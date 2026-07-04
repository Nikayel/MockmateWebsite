import { describe, it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { remarkNoIndentedCode } from "../markdown/remark-no-indented-code"

function render(markdown: string, plugins: unknown[]): string {
  return renderToStaticMarkup(
    createElement(ReactMarkdown, { remarkPlugins: plugins as never }, markdown)
  )
}

// A wrapped list continuation / template-literal-aligned line that lands at 4 spaces.
const indented = "Normal paragraph line.\n\n    accidentally indented four spaces\n"

describe("remarkNoIndentedCode", () => {
  it("baseline: CommonMark turns 4-space-indented text into a <pre> code block", () => {
    const html = render(indented, [remarkGfm])
    expect(html).toContain("<pre>")
  })

  it("with the plugin, the same indented text renders as prose (no <pre>)", () => {
    const html = render(indented, [remarkGfm, remarkNoIndentedCode])
    expect(html).not.toContain("<pre>")
    expect(html).toContain("accidentally indented four spaces")
  })

  it("fenced code is still a code block", () => {
    const html = render("```\nSELECT 1;\n```\n", [remarkGfm, remarkNoIndentedCode])
    expect(html).toContain("<code")
    expect(html).toContain("SELECT 1;")
  })
})
