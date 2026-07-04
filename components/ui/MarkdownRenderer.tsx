"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"

import { preprocessAsciiArt, markdownComponents, remarkNoIndentedCode } from "@/lib/markdown"

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Renders markdown content with LaTeX math support and ASCII art preservation.
 *
 * Features:
 * - Inline math: $...$ or \(...\)
 * - Display math: $$...$$ or \[...\]
 * - Code blocks: Preserves whitespace for ASCII diagrams
 * - Auto-detects ASCII art and wraps in code blocks
 */
export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const processedContent = preprocessAsciiArt(content)

  return (
    <div className={className}>
      <ReactMarkdown
        // remarkNoIndentedCode is hand-typed (unified's Processor type isn't importable
        // under pnpm), so cast it to the same Plugin shape remarkGfm already satisfies.
        remarkPlugins={[remarkGfm, remarkMath, remarkNoIndentedCode as unknown as typeof remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
