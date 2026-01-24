"use client"

import ReactMarkdown, { Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Detects ASCII art patterns in text that should be rendered as code blocks.
 * Looks for:
 * - Box drawing characters (─, │, ┌, └, ├, ┤, ┬, ┴, ┼, etc.)
 * - Arrow characters (→, ←, ↑, ↓, ↔, ⟶, ⟵)
 * - Tree/diagram patterns with consistent indentation
 * - Lines with significant leading whitespace and special characters
 */
function preprocessAsciiArt(text: string): string {
  // Characters that indicate ASCII art diagrams
  const asciiArtChars = /[─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬→←↑↓↔⟶⟵▲▼◀▶●○◉■□▪▫]/
  const arrowPattern = /[→←↑↓↔]|->|<-|-->/
  const treePattern = /^\s{2,}[\/\\|]|[\/\\]\s*$/
  const boxPattern = /^\s*[\+\-\|]+\s*$/
  const diagramIndent = /^\s{4,}\S/ // Lines with 4+ spaces of indent

  const lines = text.split("\n")
  const result: string[] = []
  let inAsciiBlock = false
  let asciiBlockLines: string[] = []
  let consecutiveAsciiLines = 0

  const isAsciiArtLine = (line: string): boolean => {
    // Empty lines in the middle of diagrams should be preserved
    if (line.trim() === "" && inAsciiBlock) return true

    // Check for ASCII art indicators
    if (asciiArtChars.test(line)) return true
    if (arrowPattern.test(line)) return true
    if (treePattern.test(line)) return true
    if (boxPattern.test(line)) return true

    // Check for diagram-like indentation patterns (4+ spaces with content)
    if (diagramIndent.test(line)) {
      // Additional heuristics for diagram lines
      const trimmed = line.trim()
      // Likely a diagram if it has special chars or very structured content
      if (/^[\[\](){}<>|\/\\:.*#@\-=+_^~`'"!?&%$;,\s\d]+$/.test(trimmed)) return true
      // Short lines with specific patterns
      if (trimmed.length < 40 && /[|\/\\<>\[\]{}()]/.test(trimmed)) return true
    }

    return false
  }

  const flushAsciiBlock = () => {
    if (asciiBlockLines.length >= 2) {
      // Wrap in code block
      result.push("```")
      result.push(...asciiBlockLines)
      result.push("```")
    } else if (asciiBlockLines.length === 1) {
      // Single line - just add as-is wrapped in code
      result.push("```")
      result.push(asciiBlockLines[0])
      result.push("```")
    }
    asciiBlockLines = []
    inAsciiBlock = false
    consecutiveAsciiLines = 0
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isAscii = isAsciiArtLine(line)

    // Skip if already inside a code block (marked with ```)
    if (line.trim().startsWith("```")) {
      if (inAsciiBlock) {
        flushAsciiBlock()
      }
      result.push(line)
      // Skip until end of code block
      let j = i + 1
      while (j < lines.length && !lines[j].trim().startsWith("```")) {
        result.push(lines[j])
        j++
      }
      if (j < lines.length) {
        result.push(lines[j])
      }
      i = j
      continue
    }

    if (isAscii) {
      if (!inAsciiBlock) {
        inAsciiBlock = true
      }
      asciiBlockLines.push(line)
      consecutiveAsciiLines++
    } else {
      if (inAsciiBlock) {
        // Check if this is just a label line followed by more ASCII
        const nextLines = lines.slice(i + 1, i + 3)
        const hasMoreAscii = nextLines.some((l) => isAsciiArtLine(l) && l.trim() !== "")

        if (
          hasMoreAscii &&
          line.trim() !== "" &&
          consecutiveAsciiLines >= 2 &&
          line.trim().length < 50
        ) {
          // This might be a label within the diagram, include it
          asciiBlockLines.push(line)
        } else {
          flushAsciiBlock()
          result.push(line)
        }
      } else {
        result.push(line)
      }
    }
  }

  // Flush any remaining ASCII block
  if (inAsciiBlock) {
    flushAsciiBlock()
  }

  return result.join("\n")
}

/**
 * Renders markdown content with LaTeX math support and ASCII art preservation
 * Uses remark-math + rehype-katex for proper math rendering:
 * - Inline math: $...$ or \(...\)
 * - Display math: $$...$$ or \[...\]
 * - Code blocks: Preserves whitespace for ASCII diagrams (trees, graphs, matrices)
 * - Auto-detects ASCII art and wraps in code blocks for proper rendering
 */
export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  // Preprocess content to detect and wrap ASCII art
  const processedContent = preprocessAsciiArt(content)
  const components: Components = {
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    li: ({ children }) => <li>{children}</li>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    // Code blocks (``` code ```) - for ASCII art diagrams
    pre: ({ children }) => (
      <pre className="my-3 overflow-x-auto rounded-lg border border-gray-700/50 bg-gray-900/80 p-3 font-mono text-xs leading-relaxed text-gray-200">
        {children}
      </pre>
    ),
    // Inline code and code inside pre blocks
    code: ({ className, children, ...props }) => {
      // Check if this is a code block (inside pre) vs inline code
      const isCodeBlock =
        className?.includes("language-") ||
        props.node?.position?.start.line !== props.node?.position?.end.line

      if (isCodeBlock) {
        // Code block content - preserve whitespace, no extra styling (pre handles it)
        return (
          <code className="font-mono whitespace-pre" {...props}>
            {children}
          </code>
        )
      }

      // Inline code
      return (
        <code
          className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-300"
          {...props}
        >
          {children}
        </code>
      )
    },
    ul: ({ children }) => <ul className="mb-2 list-inside list-disc space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="mb-2 list-inside list-decimal space-y-1">{children}</ol>,
    // Tables - for matrix/grid visualizations
    table: ({ children }) => (
      <div className="my-3 overflow-x-auto">
        <table className="min-w-full border-collapse font-mono text-xs">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="border-b border-gray-700 bg-gray-800/50">{children}</thead>
    ),
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr className="border-b border-gray-700/50">{children}</tr>,
    th: ({ children }) => (
      <th className="px-3 py-2 text-left font-semibold text-gray-300">{children}</th>
    ),
    td: ({ children }) => <td className="px-3 py-2 text-gray-400">{children}</td>,
    // Blockquotes - for notes/hints
    blockquote: ({ children }) => (
      <blockquote className="my-2 border-l-2 border-blue-500/50 bg-blue-500/5 py-1 pl-3 text-gray-300 italic">
        {children}
      </blockquote>
    ),
    // Headings
    h1: ({ children }) => <h1 className="mb-3 text-lg font-bold text-white">{children}</h1>,
    h2: ({ children }) => <h2 className="mb-2 text-base font-semibold text-white">{children}</h2>,
    h3: ({ children }) => <h3 className="mb-2 text-sm font-semibold text-gray-200">{children}</h3>,
    // Horizontal rule
    hr: () => <hr className="my-4 border-gray-700" />,
    // Links
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 underline hover:text-blue-300"
      >
        {children}
      </a>
    ),
  }

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
