"use client"

import dynamic from "next/dynamic"
import { parseWidgetSpec, type WidgetSpec } from "@/lib/tutorials/widgets/schema"
import { WidgetError } from "./WidgetFrame"

/**
 * Renders a ```cswidget fence body. This is the single entry point the Markdown
 * pipeline calls. Parsing is EAGER (cheap, and a malformed spec must render a readable
 * inline error, not a skeleton); the widget families themselves load through
 * next/dynamic so the interactive chunk is fetched only when a lesson actually renders
 * a widget — SQL/Python lessons and widget-free SD lessons pay zero bundle cost.
 *
 * ssr: false — widgets are stateful client interactives inside an already-client
 * TeachPanel; the initial HTML renders a spec-sized placeholder instead, so the widget
 * appearing does not shift the prose around it (CLS).
 */
const WidgetBody = dynamic(() => import("./WidgetBody").then((m) => ({ default: m.WidgetBody })), {
  ssr: false,
  loading: () => null,
})

/**
 * Conservative FLOOR for the widget's rendered height, derived from the spec, applied
 * while the lazy chunk loads. Estimates low on purpose: a too-tall floor leaves dead
 * whitespace after load, while a slightly-short one only shifts by the small remainder.
 */
function estimateMinHeight(spec: WidgetSpec): number {
  switch (spec.type) {
    case "check":
      return spec.kind === "predict"
        ? 130 + (spec.options?.length ?? 0) * 42
        : 150 + (spec.items?.length ?? 0) * 46
    case "calc":
    case "hash-ring":
    case "rate-limiter":
    case "quorum":
      // Predict phase renders first: title + question + option chips.
      return 150 + Math.ceil(spec.predictPrompt.options.length / 2) * 34
    case "sequence":
      // Lanes header + step rows (the diagram allocates all slots up front).
      return 170 + Math.max(spec.steps.length, 2) * 40
    default:
      return 120
  }
}

export function CsWidget({ source }: { source: string }) {
  const result = parseWidgetSpec(source)
  if (!result.ok) return <WidgetError message={result.error} />
  return (
    <div data-cswidget={result.spec.type} style={{ minHeight: estimateMinHeight(result.spec) }}>
      <WidgetBody spec={result.spec} />
    </div>
  )
}
