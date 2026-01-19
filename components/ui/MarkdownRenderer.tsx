"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { InlineMath, BlockMath } from "react-katex"
import "katex/dist/katex.min.css"
import { useMemo } from "react"

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Renders markdown content with LaTeX math support
 * Handles:
 * - Markdown formatting (bold, italic, lists, etc.)
 * - Inline math: $...$
 * - Display math: $$...$$
 */
export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const { processedContent, mathData } = useMemo(() => {
    const blockMaths: string[] = []
    const inlineMaths: string[] = []

    // First, replace display math blocks ($$...$$) to avoid conflicts
    let processed = content.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
      const index = blockMaths.length
      blockMaths.push(math.trim())
      return `__BLOCK_MATH_${index}__`
    })

    // Then replace inline math ($...$), but skip if it's part of a placeholder
    processed = processed.replace(/\$([^$\n]+?)\$/g, (match, math) => {
      if (match.includes("__BLOCK_MATH_")) return match
      const index = inlineMaths.length
      inlineMaths.push(math.trim())
      return `__INLINE_MATH_${index}__`
    })

    return {
      processedContent: processed,
      mathData: { blockMaths, inlineMaths },
    }
  }, [content])

  // Custom component that renders math placeholders
  const components = {
    p: ({ children }: any) => {
      return <p className="mb-2 last:mb-0">{children}</p>
    },
    li: ({ children }: any) => {
      return <li>{children}</li>
    },
    strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    code: ({ children }: any) => (
      <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-300">
        {children}
      </code>
    ),
    ul: ({ children }: any) => <ul className="mb-2 list-inside list-disc space-y-1">{children}</ul>,
    ol: ({ children }: any) => (
      <ol className="mb-2 list-inside list-decimal space-y-1">{children}</ol>
    ),
    text: ({ children }: any) => {
      // Process text nodes to replace math placeholders
      if (typeof children === "string") {
        return <>{processTextWithMath(children)}</>
      }
      return <>{children}</>
    },
  }

  function processTextWithMath(text: string): React.ReactNode[] {
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let keyCounter = 0

    // First, find all block math placeholders
    const blockRegex = /__BLOCK_MATH_(\d+)__/g
    let match: RegExpExecArray | null
    const blockMatches: Array<{ index: number; mathIndex: number; length: number }> = []

    while ((match = blockRegex.exec(text)) !== null) {
      blockMatches.push({
        index: match.index,
        mathIndex: parseInt(match[1]),
        length: match[0].length,
      })
    }

    // Process block math matches
    for (const blockMatch of blockMatches) {
      if (blockMatch.index > lastIndex) {
        const textBefore = text.slice(lastIndex, blockMatch.index)
        parts.push(...processInlineMath(textBefore, keyCounter))
        keyCounter += (textBefore.match(/__INLINE_MATH_\d+__/g) || []).length
      }
      parts.push(
        <BlockMath key={`block-${keyCounter++}`} math={mathData.blockMaths[blockMatch.mathIndex]} />
      )
      lastIndex = blockMatch.index + blockMatch.length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remaining = text.slice(lastIndex)
      parts.push(...processInlineMath(remaining, keyCounter))
    }

    return parts.length > 0 ? parts : [text]
  }

  function processInlineMath(text: string, startKey: number = 0): React.ReactNode[] {
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let keyCounter = startKey

    const inlineRegex = /__INLINE_MATH_(\d+)__/g
    let match: RegExpExecArray | null

    while ((match = inlineRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      const mathIndex = parseInt(match[1])
      parts.push(
        <InlineMath key={`inline-${keyCounter++}`} math={mathData.inlineMaths[mathIndex]} />
      )
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts.length > 0 ? parts : [text]
  }

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
