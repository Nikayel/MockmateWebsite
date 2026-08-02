/**
 * End-to-end guard for the ```cswidget fence through the EXACT MarkdownRenderer
 * pipeline (preprocess -> remark -> shared components), mirroring the csdiagram
 * fence-render suite. Two layers:
 *
 *  1. Pipeline: the fence is intercepted (no code box, no leaked JSON), a parse
 *     failure soft-fails to the inline error, and the wrapper carries the spec-sized
 *     placeholder. Sim/stepper bodies are behind next/dynamic (ssr: false), so pipeline
 *     SSR renders the placeholder, not the body — by design. The `check` family is the
 *     exception: it prerenders eagerly so its authored text is indexable and
 *     screen-reader readable before hydration (see lib/markdown/widget-ssr.test.tsx).
 *  2. Components: WidgetBody/CheckWidget server-render directly without touching
 *     window, proving the family components are SSR-safe even though the app path
 *     hydrates them client-side (guards against a hook reading window at render).
 */
import { describe, it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ReactMarkdown from "react-markdown"
import { preprocessAsciiArt, markdownComponents, lessonRemarkPlugins } from "@/lib/markdown"
import { parseWidgetSpec } from "@/lib/tutorials/widgets/schema"
import { WidgetBody } from "../WidgetBody"

function render(content: string): string {
  return renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      { remarkPlugins: lessonRemarkPlugins as never, components: markdownComponents },
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
  it("intercepts the fence: no code box, no leaked JSON, body prerendered", () => {
    const html = render("Before the widget.\n\n" + fence(predictSpec) + "\n\nAfter the widget.")
    expect(html).toContain('data-cswidget="check"')
    // Checks take the eager path, so the pipeline emits the real body, not a placeholder.
    expect(html).toContain("A timeout fires. What does the caller know?")
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

const calcSpec = {
  type: "calc",
  title: "From DAU to peak QPS",
  predictPrompt: {
    question: "1M DAU, 10 actions each. Roughly what average QPS is that?",
    options: ["About 100", "About 1,000", "About 100,000"],
  },
  workedExample: "At the initial values this is about 116 QPS average.",
  inputs: [
    {
      kind: "slider",
      id: "dau",
      label: "Daily active users",
      min: 10000,
      max: 100000000,
      scale: "log",
      initial: 1000000,
      unit: "users",
    },
  ],
  outputs: [{ id: "avgQps", label: "Average QPS", expr: "dau * 10 / 86400", format: "compact" }],
}

describe("calc fence through the markdown pipeline", () => {
  it("intercepts a calc fence and renders the predict phase server-side", () => {
    const html = render(fence(calcSpec))
    expect(html).toContain('data-cswidget="calc"')
    expect(html).not.toContain("language-cswidget")
  })
})

const hashRingSpec = {
  type: "hash-ring",
  title: "Add a node. How many keys move?",
  predictPrompt: {
    question:
      "4 nodes own 48 keys via hash(key) mod 4. You add a fifth node. How many keys change owner?",
    options: ["About 1 in 5", "About half", "Almost all of them"],
  },
  workedExample:
    "This is the mod-N world: 48 keys colored by owner across 4 nodes. Add a node and watch the shatter, then switch to the ring and do it again.",
  initialNodes: 4,
  maxNodes: 7,
  keys: 48,
  initialMode: "modulo",
  vnodeFactor: 16,
}

describe("hash-ring widget", () => {
  it("parses, intercepts, and renders its predict phase server-side", () => {
    const html = render(fence(hashRingSpec))
    expect(html).toContain('data-cswidget="hash-ring"')
    expect(html).not.toContain("language-cswidget")
  })

  it("rejects maxNodes <= initialNodes at spec time", () => {
    const bad = { ...hashRingSpec, maxNodes: 4 }
    const result = parseWidgetSpec(JSON.stringify(bad))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("maxNodes")
  })

  it("server-renders the body without touching window, ramp intact", () => {
    const parsed = parseWidgetSpec(JSON.stringify(hashRingSpec))
    if (!parsed.ok) throw new Error(parsed.error)
    const html = renderToStaticMarkup(createElement(WidgetBody, { spec: parsed.spec }))
    expect(html).toContain("Hands-on: consistent hashing")
    expect(html).toContain("Add a node. How many keys move?")
    expect(html).toContain("Almost all of them")
    // Predict-first: no ring SVG (its 240x240 viewBox), controls, or read-outs
    // before the guess commits. (The frame's Reset icon is also an <svg>, so the
    // assertion targets the ring specifically.)
    expect(html).not.toContain('viewBox="0 0 240 240"')
    expect(html).not.toContain("Add node")
    expect(html).not.toContain("Last change remapped")
  })
})

describe("widget components server-render (SSR safety)", () => {
  it("renders a calc body in its predict phase without touching window", async () => {
    const parsed = parseWidgetSpec(JSON.stringify(calcSpec))
    if (!parsed.ok) throw new Error(parsed.error)
    const html = renderToStaticMarkup(createElement(WidgetBody, { spec: parsed.spec }))
    expect(html).toContain("Explore the math")
    expect(html).toContain("From DAU to peak QPS")
    expect(html).toContain("Roughly what average QPS")
    expect(html).toContain("About 1,000")
    // The ramp: no slider or output is visible before the prediction commits.
    expect(html).not.toContain('type="range"')
    expect(html).not.toContain("Average QPS")
  })

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
