"use client"

import { parseDiagramSpec } from "@/lib/tutorials/diagrams/schema"
import { DiagramError } from "./primitives/DiagramFrame"
import { PipelineDiagram } from "./PipelineDiagram"
import { JoinDiagram } from "./JoinDiagram"
import { WindowFrameDiagram } from "./WindowFrameDiagram"
import { GroupByDiagram } from "./GroupByDiagram"
import { ErDiagram } from "./ErDiagram"
import { PythonMemoryDiagram } from "./PythonMemoryDiagram"
import { CallStackDiagram } from "./CallStackDiagram"
import { ComprehensionDiagram } from "./ComprehensionDiagram"
import { DiagramTable } from "./DiagramTable"

/**
 * Renders a ```csdiagram fence body. This is the single entry point the Markdown
 * pipeline calls: it parses + validates the JSON (soft-failing to a readable error,
 * never a throw) and dispatches to the diagram for that `type`. The switch is
 * exhaustive over the discriminated union, so adding a spec type is a compile error
 * here until it's wired — no silent "unknown diagram" gaps.
 */
export function CsDiagram({ source }: { source: string }) {
  const result = parseDiagramSpec(source)
  if (!result.ok) return <DiagramError message={result.error} />

  const { spec } = result
  switch (spec.type) {
    case "pipeline":
      return <PipelineDiagram spec={spec} />
    case "join":
      return <JoinDiagram spec={spec} />
    case "window-frame":
      return <WindowFrameDiagram spec={spec} />
    case "group-by":
      return <GroupByDiagram spec={spec} />
    case "er":
      return <ErDiagram spec={spec} />
    case "python-memory":
      return <PythonMemoryDiagram spec={spec} />
    case "call-stack":
      return <CallStackDiagram spec={spec} />
    case "comprehension":
      return <ComprehensionDiagram spec={spec} />
    case "table":
      return <DiagramTable spec={spec} />
    default: {
      const _exhaustive: never = spec
      return _exhaustive
    }
  }
}
