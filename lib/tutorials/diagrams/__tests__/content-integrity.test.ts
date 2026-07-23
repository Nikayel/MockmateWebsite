/**
 * Every authored csdiagram AND cswidget fence in the SHIPPED curriculum must (1) parse
 * and (2) actually RENDER through the real Markdown pipeline without swallowing the
 * prose around it.
 *
 * The original version only parsed extracted fence bodies — which silently green-lit
 * five lessons whose closing ``` had trailing text on the same line (per CommonMark the
 * fence never closes: no diagram renders AND the following prose is eaten). This version
 * drives each lesson's teach.markdown through the SAME pipeline MarkdownRenderer uses and
 * asserts the fence rendered and no raw spec JSON leaked as text. It grows with content:
 * Python + SQL + System Design levels are all walked, so newly authored fences in any
 * path land in the gate automatically.
 *
 * Determinism rule: the same markdown must render byte-identical HTML twice. Any widget
 * or diagram whose output varies run-to-run (unseeded randomness, time reads) fails here,
 * which is what keeps render assertions stable across CI runs.
 */
import { describe, it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { PYTHON_LEVELS } from "@/lib/tutorials/curriculum"
import { SQL_LEVELS } from "@/lib/tutorials/sql/curriculum"
import { SYSTEM_DESIGN_LEVELS } from "@/lib/tutorials/system-design/curriculum"
import { preprocessAsciiArt, markdownComponents, remarkNoIndentedCode } from "@/lib/markdown"
import { parseWidgetSpec } from "@/lib/tutorials/widgets/schema"
import { parseDiagramSpec } from "../schema"
import { extractCsDiagramSources, extractCsWidgetSources } from "../extract"

interface LessonRef {
  lessonId: string
  markdown: string
  diagramSources: string[]
  widgetSources: string[]
}

function collectLessons(): LessonRef[] {
  const refs: LessonRef[] = []
  for (const level of [...PYTHON_LEVELS, ...SQL_LEVELS, ...SYSTEM_DESIGN_LEVELS]) {
    for (const mod of level.modules) {
      for (const lesson of mod.lessons) {
        const diagramSources = extractCsDiagramSources(lesson.teach.markdown)
        const widgetSources = extractCsWidgetSources(lesson.teach.markdown)
        if (diagramSources.length > 0 || widgetSources.length > 0)
          refs.push({
            lessonId: lesson.id,
            markdown: lesson.teach.markdown,
            diagramSources,
            widgetSources,
          })
      }
    }
  }
  return refs
}

function renderLesson(markdown: string): string {
  return renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      { remarkPlugins: [remarkGfm, remarkNoIndentedCode] as never, components: markdownComponents },
      preprocessAsciiArt(markdown)
    )
  )
}

const lessons = collectLessons()
const diagramFences = lessons.flatMap((l) =>
  l.diagramSources.map((source) => ({ lessonId: l.lessonId, source }))
)
const widgetFences = lessons.flatMap((l) =>
  l.widgetSources.map((source) => ({ lessonId: l.lessonId, source }))
)

describe("authored csdiagram content", () => {
  it("finds diagrams in the curriculum (guards the extractor itself)", () => {
    expect(diagramFences.length).toBeGreaterThan(0)
  })

  it.each(diagramFences)("$lessonId → spec parses", ({ source }) => {
    const result = parseDiagramSpec(source)
    if (!result.ok) throw new Error(result.error)
    expect(result.ok).toBe(true)
  })
})

// SD widget authoring starts in a later iteration; the block is conditional so the gate
// activates the moment the first fence lands without failing while there are none.
if (widgetFences.length > 0) {
  describe("authored cswidget content", () => {
    it.each(widgetFences)("$lessonId → widget spec parses", ({ source }) => {
      const result = parseWidgetSpec(source)
      if (!result.ok) throw new Error(result.error)
      expect(result.ok).toBe(true)
    })
  })
}

describe("fence-bearing lessons render through the real pipeline", () => {
  it.each(lessons)("$lessonId → renders, swallows no prose, deterministic", ({ markdown }) => {
    const html = renderLesson(markdown)
    // A broken/unclosed fence dumps the spec JSON into the page as text; a rendered
    // fence consumes it. These raw JSON keys must therefore NEVER appear in output.
    expect(html).not.toContain('"caption"')
    expect(html).not.toContain('"type"')
    // The fence classNames must be consumed, and no soft parse-error should have fired.
    expect(html).not.toContain("language-csdiagram")
    expect(html).not.toContain("language-cswidget")
    expect(html).not.toContain("could not render")
    // Determinism: unseeded randomness or time reads in a renderer make content
    // assertions flaky and are banned — the same markdown renders byte-identically.
    expect(renderLesson(markdown)).toBe(html)
  })
})
