"use client"

import { CodeMirrorEditor, CodeMirrorErrorBoundary } from "@/components/editor"

/**
 * A read-only, syntax-highlighted code panel that sizes to its content. Worked examples and
 * reference solutions have a known length at render time, so a fixed short box (the old
 * `height={140}` panes) only hid their trailing lines behind an internal scrollbar. This grows to
 * fit the code and scrolls internally only past `maxHeight`, so short snippets stay compact and long
 * ones are fully readable. Optional chrome (a header label) matches the surrounding lesson panels.
 * Shared by the teach demo and both exercise runners' reference views so every read-only code
 * surface behaves identically.
 */
export interface ReadOnlyCodeBlockProps {
  code: string
  /** Syntax-highlighting language, e.g. "python" | "sql". */
  language: string
  /** Optional header label rendered above the code (e.g. "Reference solution", "Example query"). */
  label?: string
  /** Height (px) beyond which the panel scrolls internally instead of growing. Defaults to 560. */
  maxHeight?: number
}

export function ReadOnlyCodeBlock({
  code,
  language,
  label,
  maxHeight = 560,
}: ReadOnlyCodeBlockProps) {
  return (
    <div className="border-border overflow-hidden rounded-lg border">
      {label && (
        <div className="border-border bg-muted/40 text-muted-foreground border-b px-3 py-1.5 text-xs font-medium">
          {label}
        </div>
      )}
      <CodeMirrorErrorBoundary>
        <CodeMirrorEditor value={code} language={language} readOnly autoHeight maxHeight={maxHeight} />
      </CodeMirrorErrorBoundary>
    </div>
  )
}
