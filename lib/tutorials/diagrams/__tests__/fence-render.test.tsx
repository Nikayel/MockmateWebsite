import { describe, it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { preprocessAsciiArt, markdownComponents, remarkNoIndentedCode } from "@/lib/markdown"

/**
 * End-to-end guard for the ```csdiagram fence through the EXACT MarkdownRenderer
 * pipeline (preprocess -> remark -> shared components). Also proves the diagrams are
 * SSR-safe: MarkdownRenderer is a client component, but Next still server-renders it
 * for the initial HTML, so a hook that touched `window` at render would crash the
 * lesson page here. renderToStaticMarkup is that server render.
 */
function render(content: string): string {
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

function fence(spec: object): string {
  return "```csdiagram\n" + JSON.stringify(spec) + "\n```"
}

describe("csdiagram fence rendering", () => {
  it("renders a static pipeline diagram, not a code box or raw JSON", () => {
    const html = render(fence({ type: "pipeline", preset: "sql-select" }))
    expect(html).toContain("WHERE")
    expect(html).toContain("GROUP BY")
    expect(html).not.toContain("language-csdiagram")
    expect(html).not.toContain('"type"') // the JSON body is consumed, not printed
  })

  it("server-renders a TRIGGERED diagram (join) without throwing", () => {
    const html = render(
      fence({
        type: "join",
        kind: "left",
        left: { name: "users", columns: ["id", "name"], rows: [[1, "Ada"]] },
        right: { name: "orders", columns: ["user_id", "total"], rows: [[1, 50]] },
        on: ["id", "user_id"],
      })
    )
    expect(html).toContain("LEFT JOIN")
    expect(html).toContain("<table")
  })

  it("server-renders the window-frame + call-stack diagrams (reduced-motion hook is SSR-safe)", () => {
    const win = render(
      fence({
        type: "window-frame",
        frame: "running",
        rows: [
          { label: "Jan", value: 100 },
          { label: "Feb", value: 200 },
        ],
      })
    )
    expect(win).toContain("UNBOUNDED PRECEDING")

    const stack = render(fence({ type: "call-stack", title: "f(2)", steps: [{ stack: ["f(2)"] }] }))
    expect(stack).toContain("Call stack")
  })

  it("shows a soft error for a malformed spec (never throws, never crashes the lesson)", () => {
    const html = render("```csdiagram\n{ not valid json \n```")
    expect(html).toContain("could not render")
  })

  it("leaves a normal code fence as a <pre> code box (no regression)", () => {
    const html = render("```python\nprint('hi')\n```")
    expect(html).toContain("<pre")
    expect(html).toContain("print")
  })
})
