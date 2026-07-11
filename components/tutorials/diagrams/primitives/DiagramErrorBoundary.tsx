"use client"

import { Component, type ReactNode } from "react"
import { DiagramError } from "./DiagramFrame"

/**
 * Contains a render throw to the single diagram. parseDiagramSpec catches bad DATA, but
 * a renderer could still throw on an edge the schema doesn't model; without this boundary
 * that error propagates to the app-root boundary whose fallback is a FULL-SCREEN page —
 * so one bad diagram would blank the whole lesson. Here it degrades to the inline error box.
 */
export class DiagramErrorBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state = { message: null as string | null }

  static getDerivedStateFromError(err: unknown) {
    return { message: err instanceof Error ? err.message : "diagram failed to render" }
  }

  render() {
    if (this.state.message) return <DiagramError message={this.state.message} />
    return this.props.children
  }
}
