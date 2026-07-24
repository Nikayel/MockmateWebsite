"use client"

import type { WidgetSpec } from "@/lib/tutorials/widgets/schema"
import { WidgetErrorBoundary } from "./WidgetErrorBoundary"
import { CheckWidget } from "./CheckWidget"
import { CalcWidget } from "./CalcWidget"
import { HashRingWidget } from "./HashRingWidget"
import { SequenceWidget } from "./SequenceWidget"
import { RateLimiterWidget } from "./RateLimiterWidget"
import { QuorumWidget } from "./QuorumWidget"

/**
 * Dispatches a VALIDATED widget spec to its family component. This module (plus the
 * families it imports) is the lazily loaded half of the cswidget pipeline — CsWidget
 * next/dynamic-imports it so lessons without widgets never ship the chunk. The switch
 * is exhaustive over the discriminated union, so adding a schema family without wiring
 * its renderer is a compile error here — no silent "unknown widget" gaps.
 */
export function WidgetBody({ spec }: { spec: WidgetSpec }) {
  // A render throw on a schema edge stays contained to this box, never the app root.
  return <WidgetErrorBoundary>{renderSpec(spec)}</WidgetErrorBoundary>
}

function renderSpec(spec: WidgetSpec) {
  switch (spec.type) {
    case "check":
      return <CheckWidget spec={spec} />
    case "calc":
      return <CalcWidget spec={spec} />
    case "hash-ring":
      return <HashRingWidget spec={spec} />
    case "sequence":
      return <SequenceWidget spec={spec} />
    case "rate-limiter":
      return <RateLimiterWidget spec={spec} />
    case "quorum":
      return <QuorumWidget spec={spec} />
    default: {
      // Exhaustiveness guard: adding a spec type without a case is a compile error here.
      const _exhaustive: never = spec
      void _exhaustive
      return null
    }
  }
}
