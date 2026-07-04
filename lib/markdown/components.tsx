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
    <thead className="border-border bg-muted/50 border-b">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-border/60 border-b">{children}</tr>,
  th: ({ children }) => (
    <th className="text-foreground px-3 py-2 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="text-muted-foreground px-3 py-2">{children}</td>,

  // Blockquotes - for notes/hints
  blockquote: ({ children }) => (
    <blockquote className="text-foreground/80 my-2 border-l-2 border-blue-500/50 bg-blue-500/5 py-1 pl-3 italic">
      {children}
    </blockquote>
  ),

  // Headings — semantic tokens so they stay legible in light and dark
  h1: ({ children }) => <h1 className="text-foreground mb-3 text-lg font-bold">{children}</h1>,
  h2: ({ children }) => (
    <h2 className="text-foreground mb-2 text-base font-semibold">{children}</h2>
  ),
  h3: ({ children }) => <h3 className="text-foreground mb-2 text-sm font-semibold">{children}</h3>,

  // Horizontal rule
  hr: () => <hr className="border-border my-4" />,

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline hover:opacity-80 dark:text-blue-400"
    >
      {children}
    </a>
  ),
}
