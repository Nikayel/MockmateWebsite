/**
 * Pull fenced block bodies out of a markdown string. Used by the content-integrity
 * tests to validate every authored ```csdiagram (and now ```cswidget) instance in the
 * curriculum, and available to any tooling that needs to audit fence usage. Matches a
 * fence the way remark does: a line that starts ```<label> through the next ``` line.
 */
export function extractFenceSources(markdown: string, label: string): string[] {
  const fence = new RegExp("```" + label + "[^\\n]*\\n([\\s\\S]*?)\\n```", "g")
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = fence.exec(markdown)) !== null) out.push(m[1])
  return out
}

/** Every ```csdiagram fence body in a markdown string (the original, still-used entry point). */
export function extractCsDiagramSources(markdown: string): string[] {
  return extractFenceSources(markdown, "csdiagram")
}

/** Every ```cswidget fence body in a markdown string (interactive widgets). */
export function extractCsWidgetSources(markdown: string): string[] {
  return extractFenceSources(markdown, "cswidget")
}
