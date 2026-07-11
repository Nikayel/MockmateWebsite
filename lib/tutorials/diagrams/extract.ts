/**
 * Pull every ```csdiagram fence body out of a markdown string. Used by the
 * content-integrity test to validate every authored diagram in the curriculum, and
 * available to any tooling that needs to audit diagram usage. Matches the fence the
 * way remark does: a line that is exactly ```csdiagram through the next ``` line.
 */
const FENCE = /```csdiagram[^\n]*\n([\s\S]*?)\n```/g

export function extractCsDiagramSources(markdown: string): string[] {
  const out: string[] = []
  let m: RegExpExecArray | null
  FENCE.lastIndex = 0
  while ((m = FENCE.exec(markdown)) !== null) out.push(m[1])
  return out
}
