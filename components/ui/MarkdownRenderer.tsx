"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"

import { preprocessAsciiArt, markdownComponents } from "@/lib/markdown"

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
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
