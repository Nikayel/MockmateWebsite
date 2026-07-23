"use client"

import { Component, type ReactNode } from "react"
import { WidgetError } from "./WidgetFrame"

/**
 * Contains a render throw to the single widget. parseWidgetSpec catches bad DATA, but a
 * family renderer could still throw on an edge the schema doesn't model; without this
 * boundary that error propagates to the app-root boundary whose fallback is a
 * FULL-SCREEN page — so one bad widget would blank the whole lesson. Here it degrades
 * to the inline error box (same containment story as DiagramErrorBoundary).
 */
export class WidgetErrorBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state = { message: null as string | null }

  static getDerivedStateFromError(err: unknown) {
    return { message: err instanceof Error ? err.message : "widget failed to render" }
  }

  render() {
    if (this.state.message) return <WidgetError message={this.state.message} />
    return this.props.children
  }
}
