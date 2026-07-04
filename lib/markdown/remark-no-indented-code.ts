/**
 * Disables CommonMark's *indented* code blocks (a line indented 4+ spaces / a tab).
 *
 * Authored lesson prose occasionally picks up stray indentation — a wrapped list
 * continuation, content aligned to surrounding TS template-literal code — and CommonMark
 * would silently turn it into a monospace code block, showing raw `**` / backticks and
 * breaking list numbering. Fenced code (``` ... ```) is untouched, so only explicit
 * fences ever become code.
 *
 * This registers a micromark extension (react-markdown v10 parses via micromark), so it
 * is one global source of truth: every surface rendering through `MarkdownRenderer`
 * inherits it, with nothing to change per lesson.
 *
 * Types are declared locally because `unified` is a transitive (non-hoisted) dependency
 * and cannot be imported directly under pnpm.
 */
interface MicromarkExtension {
  disable?: { null?: string[] }
}

interface ProcessorData {
  micromarkExtensions?: MicromarkExtension[]
}

interface ProcessorLike {
  data(): ProcessorData
}

export function remarkNoIndentedCode(this: ProcessorLike): void {
  const data = this.data()
  const extensions = data.micromarkExtensions || (data.micromarkExtensions = [])
  extensions.push({ disable: { null: ["codeIndented"] } })
}
