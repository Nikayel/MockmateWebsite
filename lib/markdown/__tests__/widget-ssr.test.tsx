/**
 * The `check` widget must be CRAWLABLE and SEALED at the same time.
 *
 * Lesson teach pages are public and indexed, and checks carry a large share of their
 * authored substance (hundreds of fences across the live corpus). While the whole widget
 * pipeline sat behind `next/dynamic(..., { ssr: false })` every one of those questions
 * rendered as empty markup: invisible to a crawler, and invisible to a screen reader
 * reading the page before hydration. `CsWidget` now renders the check family eagerly.
 *
 * That creates the opposite risk, which is why both halves are asserted here over the
 * REAL corpus rather than a fixture:
 *
 *  - VISIBLE: the prompt and every option / item / bucket label reach the prerendered
 *    HTML, through the exact lesson markdown pipeline a page uses.
 *  - SEALED: nothing that resolves the question does. No option is pre-selected, no
 *    per-option feedback and no `reveal` is in the DOM, and the feedback box itself does
 *    not exist until the learner commits. A check whose answer is readable in view-source
 *    is not retrieval practice.
 *
 * Everything is derived from `course-catalog` at run time: the corpus is a moving target
 * (a concurrent authoring loop adds lessons), so no id, count, or list is hardcoded. The
 * one hard number is a lower bound guarding against a silent pass on an empty walk.
 */
import { describe, it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ReactMarkdown from "react-markdown"
import { preprocessAsciiArt, markdownComponents, lessonRemarkPlugins } from "@/lib/markdown"
import { listAllCatalogEntries } from "@/lib/tutorials/course-catalog"
import { parseWidgetSpec, type CheckSpec } from "@/lib/tutorials/widgets/schema"
import { CsWidget } from "@/components/tutorials/widgets/CsWidget"

/** Matches a ```cswidget fence body in authored teach markdown. */
const WIDGET_FENCE = /```cswidget\r?\n([\s\S]*?)```/g

interface CorpusCheck {
  /** Human-readable locator, so a failure names the lesson to open. */
  where: string
  source: string
  spec: CheckSpec
}

interface CorpusLesson {
  where: string
  markdown: string
  checks: CorpusCheck[]
}

/** One non-check fence, kept as the negative control for the lazy path. */
interface CorpusLazyWidget {
  where: string
  source: string
  type: string
}

/** Every lesson that authors at least one widget, with its check and non-check fences split. */
function collectWidgetFences(): { lessons: CorpusLesson[]; lazy: CorpusLazyWidget[] } {
  const lessons: CorpusLesson[] = []
  const lazy: CorpusLazyWidget[] = []
  for (const { courseId, lesson } of listAllCatalogEntries()) {
    const markdown = lesson.teach?.markdown ?? ""
    if (!markdown.includes("```cswidget")) continue
    const where = `${courseId}/${lesson.id}`
    const checks: CorpusCheck[] = []
    for (const match of markdown.matchAll(WIDGET_FENCE)) {
      const source = match[1]
      const parsed = parseWidgetSpec(source)
      // Malformed fences are another suite's problem; this one is about render paths.
      if (!parsed.ok) continue
      if (parsed.spec.type === "check") checks.push({ where, source, spec: parsed.spec })
      else lazy.push({ where, source, type: parsed.spec.type })
    }
    if (checks.length > 0) lessons.push({ where, markdown, checks })
  }
  return { lessons, lazy }
}

const { lessons: LESSONS_WITH_CHECKS, lazy: LAZY_WIDGETS } = collectWidgetFences()
const ALL_CHECKS = LESSONS_WITH_CHECKS.flatMap((lesson) => lesson.checks)

/** Render markdown through the EXACT lesson pipeline (preprocess -> remark -> components). */
function renderMarkdown(content: string): string {
  return renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      { remarkPlugins: lessonRemarkPlugins as never, components: markdownComponents },
      preprocessAsciiArt(content)
    )
  )
}

/** Render one fence body straight through the widget entry point, skipping remark. */
function renderFence(source: string): string {
  return renderToStaticMarkup(createElement(CsWidget, { source }))
}

/**
 * The text a crawler or screen reader actually gets: tags dropped, entities decoded,
 * whitespace collapsed. Authored labels contain quotes, apostrophes, and `<`/`>` from
 * code snippets, all of which React escapes, so a raw substring match on the HTML would
 * fail for reasons that have nothing to do with visibility.
 */
function visibleText(html: string): string {
  return normalize(
    html
      .replace(/<[^>]*>/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
  )
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

/**
 * Short feedback lines ("Yes.", "No.") are substrings of ordinary prose, so asserting
 * their absence would be a coin flip. Only lines long enough to be unmistakably THIS
 * check's answer are used as leak probes.
 */
const LEAK_PROBE_MIN_LENGTH = 24

function leakProbes(spec: CheckSpec): string[] {
  const probes = [
    ...(spec.options ?? []).map((option) => option.feedback),
    ...(spec.items ?? []).map((item) => item.feedback ?? ""),
    spec.reveal ?? "",
  ]
  return probes.map(normalize).filter((probe) => probe.length >= LEAK_PROBE_MIN_LENGTH)
}

describe("check widgets prerender their authored text", () => {
  it("finds checks in the live corpus (guards against a silent pass on an empty walk)", () => {
    // Deliberately a floor, not a count: the corpus grows under a concurrent authoring
    // loop, and pinning the real total would turn every new lesson into a failing test.
    expect(ALL_CHECKS.length).toBeGreaterThan(0)
    expect(LESSONS_WITH_CHECKS.length).toBeGreaterThan(0)
  })

  it("emits the prompt and every option label through the real markdown pipeline", () => {
    const lesson = LESSONS_WITH_CHECKS.find((entry) =>
      entry.checks.some((check) => check.spec.kind === "predict")
    )
    if (!lesson) throw new Error("no lesson in the corpus authors a predict check")

    const text = visibleText(renderMarkdown(lesson.markdown))
    for (const { spec } of lesson.checks) {
      expect(text, `${lesson.where}: prompt missing`).toContain(normalize(spec.prompt))
      for (const option of spec.options ?? []) {
        expect(text, `${lesson.where}: option "${option.label}" missing`).toContain(
          normalize(option.label)
        )
      }
      for (const item of spec.items ?? []) {
        expect(text, `${lesson.where}: item "${item.label}" missing`).toContain(
          normalize(item.label)
        )
      }
      for (const bucket of spec.buckets ?? []) {
        expect(text, `${lesson.where}: bucket "${bucket}" missing`).toContain(normalize(bucket))
      }
    }
  })

  it("emits every authored label across the whole corpus", () => {
    const missing: string[] = []
    for (const { where, source, spec } of ALL_CHECKS) {
      const text = visibleText(renderFence(source))
      const wanted = [
        spec.prompt,
        ...(spec.options ?? []).map((option) => option.label),
        ...(spec.items ?? []).map((item) => item.label),
        ...(spec.buckets ?? []),
      ]
      for (const value of wanted) {
        if (!text.includes(normalize(value))) missing.push(`${where}: ${value}`)
      }
    }
    expect(missing).toEqual([])
  })

  /**
   * The negative control, and the shape of the bug this suite exists to prevent coming
   * back: a fence on the lazy path emits a sized placeholder and NOTHING else, which is
   * exactly what every check used to do. If this ever starts finding text, the split in
   * CsWidget has collapsed and the assertions above stopped proving anything.
   */
  it("still emits nothing for the sim families, which stay on the lazy path", () => {
    if (LAZY_WIDGETS.length === 0) return
    for (const { where, source, type } of LAZY_WIDGETS) {
      const html = renderFence(source)
      expect(html, `${where}: ${type} left the lazy path`).toContain(`data-cswidget="${type}"`)
      expect(visibleText(html), `${where}: ${type} prerendered text`).toBe("")
    }
  })
})

describe("check widgets stay sealed before the learner commits", () => {
  it("leaks no feedback, reveal, or preselected answer anywhere in the corpus", () => {
    const leaks: string[] = []
    for (const { where, source, spec } of ALL_CHECKS) {
      const html = renderFence(source)
      const text = visibleText(html)

      // The answer itself: per-option rationale and the wrap-up are post-commit only.
      for (const probe of leakProbes(spec)) {
        if (text.includes(probe)) leaks.push(`${where}: feedback in DOM -> ${probe.slice(0, 60)}`)
      }
      // The raw spec must never reach the HTML (that would carry `correct: true`).
      if (html.includes('"correct"')) leaks.push(`${where}: raw spec JSON in DOM`)
      // No option starts selected or pressed, in either kind.
      if (html.includes('checked=""')) leaks.push(`${where}: a radio renders pre-checked`)
      if (html.includes('aria-pressed="true"')) leaks.push(`${where}: a bucket renders pre-pressed`)
      // The verdict panel only exists after a commit, so neither it nor its status word
      // may be in the initial HTML.
      if (html.includes('aria-label="Feedback"') || html.includes('aria-label="Results"')) {
        leaks.push(`${where}: the feedback panel rendered before commit`)
      }
    }
    expect(leaks).toEqual([])
  })

  it("keeps the check interactive: commit control, reset, and a live region ship with it", () => {
    const html = renderFence(ALL_CHECKS[0]!.source)
    expect(html).toContain('data-cswidget="check"')
    expect(html).toContain("Check yourself")
    expect(html).toContain("Reset")
    expect(html).toMatch(/Check answers?/)
    expect(html).toContain('aria-live="polite"')
  })
})
