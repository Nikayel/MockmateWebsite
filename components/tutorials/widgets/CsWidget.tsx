"use client"

import dynamic from "next/dynamic"
import { parseWidgetSpec, type WidgetSpec } from "@/lib/tutorials/widgets/schema"
import { CheckWidget } from "./CheckWidget"
import { WidgetErrorBoundary } from "./WidgetErrorBoundary"
import { WidgetError } from "./WidgetFrame"

/**
 * Renders a ```cswidget fence body. This is the single entry point the Markdown
 * pipeline calls. Parsing is EAGER (cheap, and a malformed spec must render a readable
 * inline error, not a skeleton).
 *
 * TWO RENDER PATHS, split by whether the family's authored text is worth prerendering:
 *
 *  - `check` (the overwhelming majority of authored widgets) renders EAGERLY, through a
 *    normal static import, so React's prerender emits the question and every option into
 *    the initial HTML. Lesson teach pages are public and indexable, and checks carry a
 *    large share of the page's authored substance; behind `ssr: false` all of it was
 *    empty markup to a crawler and to a screen reader reading before hydration.
 *  - every OTHER family stays behind next/dynamic so the sim/stepper chunk (SVG
 *    engines, expression evaluation, step players) is fetched only when a lesson
 *    actually renders one. Those families are a small minority of the corpus, their
 *    substance is interaction rather than prose, and their predict-phase text is a
 *    sentence or two, so eagerly bundling eleven of them onto every lesson page buys
 *    almost no indexable text for a real bundle cost.
 *
 * ANSWER SAFETY: the prerendered check emits prompt + option labels ONLY. Nothing marks
 * which option is correct and no per-option feedback is in the DOM until the learner
 * commits, so making the check crawlable does not hand away the answer (see the SSR
 * assertions in lib/markdown/__tests__/widget-ssr.test.tsx, which fail if it ever does).
 */
const LazyWidgetBody = dynamic(
  () => import("./WidgetBody").then((m) => ({ default: m.WidgetBody })),
  { ssr: false, loading: () => null }
)

/** Families that take the lazy path — everything the eager `check` branch does not handle. */
type LazyWidgetSpec = Exclude<WidgetSpec, { type: "check" }>

/**
 * Conservative FLOOR for the widget's rendered height, derived from the spec, applied
 * while the lazy chunk loads. Estimates low on purpose: a too-tall floor leaves dead
 * whitespace after load, while a slightly-short one only shifts by the small remainder.
 * The eager `check` path needs none of this — it has no placeholder phase to reserve for.
 */
function estimateMinHeight(spec: LazyWidgetSpec): number {
  switch (spec.type) {
    case "calc":
    case "hash-ring":
    case "rate-limiter":
    case "quorum":
    case "cache-sim":
    case "queue-sim":
    case "partition-sim":
    case "replication-lag":
    case "watermark-sim":
      // Predict phase renders first: title + question + option chips.
      return 150 + Math.ceil(spec.predictPrompt.options.length / 2) * 34
    case "sequence":
      // Lanes header + step rows (the diagram allocates all slots up front).
      return 170 + Math.max(spec.steps.length, 2) * 40
    case "steps":
      // Title bar + first frame's rows + note box + Prev/Next controls.
      return 160 + Math.min(spec.frames[0]?.rows.length ?? 1, 8) * 30
    default:
      return 120
  }
}

export function CsWidget({ source }: { source: string }) {
  const result = parseWidgetSpec(source)
  if (!result.ok) return <WidgetError message={result.error} />
  const spec = result.spec

  if (spec.type === "check") {
    // Same containment story as the lazy path: WidgetBody wraps its dispatch in the
    // boundary, so the eager branch has to wrap its own or one bad check would blank
    // the lesson through the app-root fallback.
    return (
      <div data-cswidget="check">
        <WidgetErrorBoundary>
          <CheckWidget spec={spec} />
        </WidgetErrorBoundary>
      </div>
    )
  }

  return (
    <div data-cswidget={spec.type} style={{ minHeight: estimateMinHeight(spec) }}>
      <LazyWidgetBody spec={spec} />
    </div>
  )
}
