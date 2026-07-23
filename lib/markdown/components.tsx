import { isValidElement } from "react"
import { Components } from "react-markdown"
import { ChevronRight } from "lucide-react"
import { CsDiagram } from "@/components/tutorials/diagrams/CsDiagram"
import { CsWidget } from "@/components/tutorials/widgets/CsWidget"

/** Flatten react-markdown code-fence children (string | string[]) to the raw fence text. */
function fenceText(children: React.ReactNode): string {
  if (typeof children === "string") return children
  if (Array.isArray(children)) return children.map(fenceText).join("")
  return ""
}

/** Fences we render as components (diagram/widget), not as code boxes. */
const RENDERED_FENCE = /language-(csdiagram|cswidget)\b/

/** True when a <pre>'s child is a rendered fence (csdiagram/cswidget), so we skip the code-box shell. */
function isRenderedFenceChild(children: React.ReactNode): boolean {
  return (
    isValidElement(children) &&
    typeof (children.props as { className?: string })?.className === "string" &&
    RENDERED_FENCE.test((children.props as { className?: string }).className!)
  )
}

/**
 * Custom React Markdown components for consistent styling across the app.
 * Handles code blocks, tables, blockquotes, and other markdown elements.
 *
 * `details-card` is not a real HTML tag: `remarkDetailsCards` rewrites the
 * whitelisted <details>/<summary> markdown shape into it, and this map renders it
 * as a NATIVE details/summary card — keyboard and screen-reader semantics for free,
 * no JS state, instant toggle (nothing to degrade under prefers-reduced-motion; the
 * chevron transition is disabled there explicitly).
 */
export const markdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,

  // Code blocks (``` code ```) - for ASCII art diagrams. A ```csdiagram or ```cswidget
  // fence is a rendered component, not code, so it skips the monospace box entirely
  // (the `code` handler below returns the diagram/widget component as this child).
  pre: ({ children }) =>
    isRenderedFenceChild(children) ? (
      <>{children}</>
    ) : (
      <pre className="my-3 overflow-x-auto rounded-lg border border-gray-700/50 bg-gray-900/80 p-3 font-mono text-xs leading-relaxed text-gray-200">
        {children}
      </pre>
    ),

  // Inline code and code inside pre blocks
  code: ({ className, children, ...props }) => {
    // A ```csdiagram fence is authored diagram data — parse + render it, never a code box.
    if (className?.includes("language-csdiagram")) {
      return <CsDiagram source={fenceText(children)} />
    }

    // A ```cswidget fence is an authored interactive widget spec — same treatment.
    if (className?.includes("language-cswidget")) {
      return <CsWidget source={fenceText(children)} />
    }

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

    // Inline code — a quiet tinted chip that reads in BOTH themes. The old style was a
    // single dark chip (bg-zinc-800/text-zinc-300) that inverted badly in light mode.
    // `box-decoration-clone` keeps the chip's background/border intact when a long
    // expression wraps across lines; `break-words` lets those long spans wrap instead
    // of overflowing. Block code (inside <pre>) takes the branch above, so this is the
    // one source of truth for inline `code` everywhere it renders.
    return (
      <code
        className="rounded border border-[#e7dfd1] bg-[#f0eae0] box-decoration-clone px-1.5 py-0.5 font-mono text-[0.85em] break-words text-[#4f4a42] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        {...props}
      >
        {children}
      </code>
    )
  },

  ul: ({ children }) => <ul className="mb-2 list-inside list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-inside list-decimal space-y-1">{children}</ol>,

  // Tables — rendered from GFM markdown. Styled to match SqlResultGrid so prose
  // comparison tables and live SQL result grids read as one system: a rounded
  // bordered container, tinted sticky-feeling header, zebra body rows, and its
  // own horizontal scroll so a wide table never makes the whole page scroll.
  table: ({ children }) => (
    <div className="border-border my-3 overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left font-mono text-xs">{children}</table>
      </div>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="odd:bg-muted/20">{children}</tr>,
  // Header muted, body at full foreground — matching SqlResultGrid, so a comparison table
  // in prose and a live query result read as the same object. This was inverted: the th
  // was `text-foreground` and every td was `text-muted-foreground`, making prose tables the
  // only learner-facing table that dims its own DATA below the label naming it. The header
  // is the signpost; the cells are the thing worth reading.
  th: ({ children }) => (
    <th
      scope="col"
      className="bg-muted/40 text-muted-foreground border-border border-b px-3 py-2 font-semibold whitespace-nowrap"
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-border/60 border-b px-3 py-2 align-top">{children}</td>
  ),

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

  // Reference-sheet accordion card (see remarkDetailsCards). Native disclosure element:
  // Enter/Space toggle, focus ring, and open/closed state all come from the platform.
  "details-card": ({ title, children }: { title?: string; children?: React.ReactNode }) => (
    <details className="border-border bg-card/40 group my-3 overflow-hidden rounded-lg border">
      <summary className="text-foreground hover:bg-muted/40 focus-visible:ring-accent/50 flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm font-semibold select-none focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground h-4 w-4 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
        />
        {title}
      </summary>
      <div className="border-border/60 border-t px-4 pt-3 pb-2">{children}</div>
    </details>
  ),
} as Components
