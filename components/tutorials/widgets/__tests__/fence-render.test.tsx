/**
 * End-to-end guard for the ```cswidget fence through the EXACT MarkdownRenderer
 * pipeline (preprocess -> remark -> shared components), mirroring the csdiagram
 * fence-render suite. Two layers:
 *
 *  1. Pipeline: the fence is intercepted (no code box, no leaked JSON), a parse
 *     failure soft-fails to the inline error, and the wrapper carries the spec-sized
 *     placeholder. The widget BODY is behind next/dynamic (ssr: false), so pipeline
 *     SSR renders the placeholder, not the body — by design.
 *  2. Components: WidgetBody/CheckWidget server-render directly without touching
 *     window, proving the family components are SSR-safe even though the app path
 *     hydrates them client-side (guards against a hook reading window at render).
 */
import { describe, it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { preprocessAsciiArt, markdownComponents, remarkNoIndentedCode } from "@/lib/markdown"
import { parseWidgetSpec } from "@/lib/tutorials/widgets/schema"
import { WidgetBody } from "../WidgetBody"

function render(content: string): string {
  return renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      { remarkPlugins: [remarkGfm, remarkNoIndentedCode] as never, components: markdownComponents },
      preprocessAsciiArt(content)
    )
  )
}

function fence(spec: object): string {
  return "```cswidget\n" + JSON.stringify(spec) + "\n```"
}

const predictSpec = {
  type: "check",
  kind: "predict",
  prompt: "A timeout fires. What does the caller know?",
  options: [
    { label: "The callee failed", feedback: "A timeout is ambiguous; the callee may be slow." },
    {
      label: "Nothing certain",
      correct: true,
      feedback: "Right: four outcomes are indistinguishable.",
    },
  ],
}

const classifySpec = {
  type: "check",
  kind: "classify",
  prompt: "Sort each system by partition behavior.",
  buckets: ["CP", "AP"],
  items: [
    { label: "etcd", bucket: "CP" },
    { label: "Cassandra (CL=ONE)", bucket: "AP" },
  ],
}

describe("cswidget fence through the markdown pipeline", () => {
  it("intercepts the fence: no code box, no leaked JSON, spec-sized wrapper", () => {
    const html = render("Before the widget.\n\n" + fence(predictSpec) + "\n\nAfter the widget.")
    expect(html).toContain('data-cswidget="check"')
    expect(html).toContain("min-height")
    expect(html).not.toContain("language-cswidget")
    expect(html).not.toContain('"type"')
    expect(html).not.toContain('"prompt"')
    // The prose around the fence survives — a swallowed fence would eat "After".
    expect(html).toContain("Before the widget.")
    expect(html).toContain("After the widget.")
  })

  it("soft-fails malformed JSON to the inline error box", () => {
    const html = render(fence(predictSpec).replace('"check"', '"check')) // break the JSON
    expect(html).toContain("Widget could not render")
    expect(html).not.toContain("language-cswidget")
  })

  it("soft-fails an invalid spec (two correct options) with a readable path", () => {
    const twoCorrect = {
      ...predictSpec,
      options: predictSpec.options.map((o) => ({ ...o, correct: true })),
    }
    const html = render(fence(twoCorrect))
    expect(html).toContain("Widget could not render")
    expect(html).toContain("exactly one correct")
  })

  it("leaves ordinary code fences alone", () => {
    const html = render("```\nplain ascii art\n```")
    expect(html).toContain("plain ascii art")
    expect(html).not.toContain("data-cswidget")
  })
})

describe("widget components server-render (SSR safety)", () => {
  it("renders a predict check body without touching window", () => {
    const parsed = parseWidgetSpec(JSON.stringify(predictSpec))
    if (!parsed.ok) throw new Error(parsed.error)
    const html = renderToStaticMarkup(createElement(WidgetBody, { spec: parsed.spec }))
    expect(html).toContain("Check yourself")
    expect(html).toContain("A timeout fires. What does the caller know?")
    expect(html).toContain("Nothing certain")
    expect(html).toContain("Check answer")
    expect(html).toContain("Reset")
    // The frame's single polite live region is present from the first paint.
    expect(html).toContain('aria-live="polite"')
  })

  it("renders a classify check body with aria-pressed bucket toggles", () => {
    const parsed = parseWidgetSpec(JSON.stringify(classifySpec))
    if (!parsed.ok) throw new Error(parsed.error)
    const html = renderToStaticMarkup(createElement(WidgetBody, { spec: parsed.spec }))
    expect(html).toContain("Sort each system by partition behavior.")
    expect(html).toContain('aria-pressed="false"')
    expect(html).toContain("etcd")
    expect(html).toContain("Check answers")
  })
})
