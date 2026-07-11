/**
 * Every authored csdiagram in the SHIPPED curriculum must (1) parse and (2) actually
 * RENDER through the real Markdown pipeline without swallowing the prose around it.
 *
 * The original version only parsed extracted fence bodies — which silently green-lit
 * five lessons whose closing ``` had trailing text on the same line (per CommonMark the
 * fence never closes: no diagram renders AND the following prose is eaten). This version
 * drives each lesson's teach.markdown through the SAME pipeline MarkdownRenderer uses and
 * asserts the diagram rendered and no raw spec JSON leaked as text. It grows with content.
 */
import { describe, it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { PYTHON_LEVELS } from "@/lib/tutorials/curriculum"
import { SQL_LEVELS } from "@/lib/tutorials/sql/curriculum"
import { preprocessAsciiArt, markdownComponents, remarkNoIndentedCode } from "@/lib/markdown"
import { parseDiagramSpec } from "../schema"
import { extractCsDiagramSources } from "../extract"

interface LessonRef {
  lessonId: string
  markdown: string
  sources: string[]
}

function collectLessons(): LessonRef[] {
  const refs: LessonRef[] = []
  for (const level of [...PYTHON_LEVELS, ...SQL_LEVELS]) {
    for (const mod of level.modules) {
      for (const lesson of mod.lessons) {
        const sources = extractCsDiagramSources(lesson.teach.markdown)
        if (sources.length > 0)
          refs.push({ lessonId: lesson.id, markdown: lesson.teach.markdown, sources })
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
const fences = lessons.flatMap((l) => l.sources.map((source) => ({ lessonId: l.lessonId, source })))

describe("authored csdiagram content", () => {
  it("finds diagrams in the curriculum (guards the extractor itself)", () => {
    expect(fences.length).toBeGreaterThan(0)
  })

  it.each(fences)("$lessonId → spec parses", ({ source }) => {
    const result = parseDiagramSpec(source)
    if (!result.ok) throw new Error(result.error)
    expect(result.ok).toBe(true)
  })

  it.each(lessons)("$lessonId → diagram renders and swallows no prose", ({ markdown }) => {
    const html = renderLesson(markdown)
    // A broken/unclosed fence dumps the spec JSON into the page as text; a rendered
    // diagram consumes it. These raw JSON keys must therefore NEVER appear in output.
    expect(html).not.toContain('"caption"')
    expect(html).not.toContain('"type"')
    // The fence className must be consumed, and no soft parse-error should have fired.
    expect(html).not.toContain("language-csdiagram")
    expect(html).not.toContain("could not render")
  })
})
