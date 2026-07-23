"use client"

import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { preprocessAsciiArt, markdownComponents, lessonRemarkPlugins } from "@/lib/markdown"

interface MarkdownRendererProps {
  content: string
  className?: string
}

// The plugin shape react-markdown accepts. remarkGfm already satisfies it, so we
// reuse its type (unified's Processor/Plugin types aren't importable under pnpm)
// and cast hand-typed or lazily-loaded plugins to it, matching the existing
// remarkNoIndentedCode cast below.
type MarkdownPlugin = typeof remarkGfm

interface MathPlugins {
  remarkMath: MarkdownPlugin
  rehypeKatex: MarkdownPlugin
}

/**
 * True when the markdown source contains LaTeX math delimiters. Covers dollar
 * math ($...$, $$...$$) and the \(...\) / \[...\] escapes named in the render
 * docs. Detection is a superset of what remark-math actually transforms, so when
 * it returns false the KaTeX plugins are skipped and the output is byte-for-byte
 * identical to the eager pipeline.
 */
function containsMath(source: string): boolean {
  return source.includes("$") || source.includes("\\(") || source.includes("\\[")
}

/**
 * Renders markdown content with LaTeX math support and ASCII art preservation.
 *
 * Features:
 * - Inline math: $...$ or \(...\)
 * - Display math: $$...$$ or \[...\]
 * - Code blocks: Preserves whitespace for ASCII diagrams
 * - Auto-detects ASCII art and wraps in code blocks
 *
 * ReactMarkdown + remark-gfm (GFM tables, the csdiagram fence, and
 * remarkNoIndentedCode) render eagerly on first paint. The heavier KaTeX stack
 * (remark-math + rehype-katex + katex CSS) is code-split out of the eager bundle
 * and loaded on demand only when the source contains math, then the content
 * re-renders with the math plugins applied.
 */
export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const processedContent = preprocessAsciiArt(content)
  const [mathPlugins, setMathPlugins] = useState<MathPlugins | null>(null)

  useEffect(() => {
    if (!containsMath(processedContent) || mathPlugins) return
    let active = true
    void (async () => {
      try {
        const [remarkMathMod, rehypeKatexMod] = await Promise.all([
          import("remark-math"),
          import("rehype-katex"),
          import("./katex-css"),
        ])
        if (!active) return
        setMathPlugins({
          remarkMath: remarkMathMod.default as unknown as MarkdownPlugin,
          rehypeKatex: rehypeKatexMod.default as unknown as MarkdownPlugin,
        })
      } catch {
        // If the KaTeX bundle fails to load, the content still renders without
        // math formatting rather than crashing the page.
      }
    })()
    return () => {
      active = false
    }
  }, [processedContent, mathPlugins])

  // The canonical lesson plugin list (gfm, details-cards, no-indented-code) comes
  // from lib/markdown so tests replicating this pipeline cannot drift. Math, when
  // loaded, splices in before remarkNoIndentedCode, matching the original order.
  const remarkPlugins = mathPlugins
    ? [
        ...lessonRemarkPlugins.slice(0, -1),
        mathPlugins.remarkMath,
        lessonRemarkPlugins[lessonRemarkPlugins.length - 1],
      ]
    : lessonRemarkPlugins
  const rehypePlugins: MarkdownPlugin[] = mathPlugins ? [mathPlugins.rehypeKatex] : []

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={markdownComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
