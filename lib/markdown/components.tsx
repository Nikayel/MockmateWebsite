import { Components } from "react-markdown"

/**
 * Custom React Markdown components for consistent styling across the app.
 * Handles code blocks, tables, blockquotes, and other markdown elements.
 */
export const markdownComponents: Components = {
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
