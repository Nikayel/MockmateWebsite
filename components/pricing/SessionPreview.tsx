import { Mic } from "lucide-react"

import { cn } from "@/lib/utils"
import { c, fn, k, p, type CodeLine, type CodeToken } from "@/components/tutorials/CodeWindow"

/**
 * SessionPreview — replaces the "Traditional vs. Interactive" stock-photo wipe.
 *
 * The pricing page sells "sessions" and then never showed one. What it showed
 * instead were two hotlinked Unsplash desk photos behind a drag-to-wipe slider,
 * captioned "an illustration of the difference: a silent, solo code editor
 * (right) versus an interactive, voice-enabled AI mock interview (left)" —
 * a claim neither photograph supported, asserted again in their alt text, so
 * screen-reader users were told about product illustrations that did not exist.
 *
 * This is a hand-drawn depiction, not a screenshot, and its figcaption says so.
 * Every control and string in it is real and cited:
 *   Run Tests / Submit Fix   app/interview/_components/_sub/TestResultsPanel.tsx
 *   CodeSparring AI          app/interview/_components/ChatColumn.tsx
 *   Sable · reacting live    app/interview/_components/ChatColumn.tsx
 *   Type a question...       app/interview/_components/ChatColumn.tsx
 *   four criteria, 30%       components/ai-assisted-section.tsx (Communication)
 *
 * No session counts appear here. PRICING_CONFIG stays the single owner of those
 * and renders them once, in the plan cards.
 *
 * Deliberately a Server Component: no state, no hooks, no framer-motion, so it
 * costs nothing in the client bundle. It is passed into PricingPageClient as a
 * child rather than imported by it, which would have pulled it across the
 * "use client" boundary.
 */

const SAMPLE: CodeLine[] = [
  [k("def "), fn("total"), p("(cart, tax):")],
  [p("    sub = "), fn("sum"), p("(i.price for i in cart)")],
  [c("    # discount, then tax")],
  [p("    d = sub * rate")],
  [k("    return "), p("(sub - d) * tax")],
]

/** Describes the whole figure once, for anyone who cannot see it. */
const FIGURE_LABEL =
  "An illustration of a CodeSparring session. On the left, an editor open on " +
  "pricing_rules.py with Run Tests and Submit Fix buttons and a console reading " +
  "3 of 4 tests passing. On the right, the AI interviewer asks what the failing " +
  "test asserts and the candidate answers by voice. Below, the session is scored " +
  "on four criteria and queued for review."

const KIND_VAR: Record<string, string> = {
  kw: "var(--kw)",
  str: "var(--str)",
  com: "var(--com)",
  fn: "var(--fn)",
  num: "var(--num)",
}

function Token({ token }: { token: CodeToken }) {
  return (
    <span style={token.kind === "plain" ? undefined : { color: KIND_VAR[token.kind] }}>
      {token.text}
    </span>
  )
}

/** One inset "screen" inside the figure card. bg-background inside bg-card reads
 *  as recessed in both themes because the two tokens are always distinct. */
function Pane({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-border bg-background rounded-lg border p-3">
      <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-[0.1em] uppercase">
        {label}
      </p>
      {children}
    </div>
  )
}

function ChatBubble({ from, children }: { from: "ai" | "you"; children: string }) {
  const isAi = from === "ai"
  return (
    <div className={cn("flex", isAi ? "justify-start" : "justify-end")}>
      <p
        className={cn(
          "text-foreground max-w-[88%] px-3 py-2 text-[11px] leading-snug",
          isAi
            ? "border-accent/20 bg-accent/10 rounded-[14px_14px_14px_4px] border"
            : "bg-secondary rounded-[14px_14px_4px_14px]"
        )}
      >
        {children}
      </p>
    </div>
  )
}

function ResultChip({ children, emphasis }: { children: React.ReactNode; emphasis?: boolean }) {
  return (
    <span
      className={cn(
        "border-border rounded-full border px-3 py-1 text-xs",
        emphasis ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {children}
    </span>
  )
}

export function SessionPreview() {
  return (
    <section aria-labelledby="session-preview-heading" className="bg-background py-16 lg:py-20">
      <div className="container mx-auto px-4">
        {/* max-w-4xl matches the plan cards above and ComparisonSection below.
            The section this replaces was the only full-width block on the page,
            so the content column visibly stepped out and back in. */}
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <p className="text-accent-strong text-xs font-semibold tracking-[0.12em] uppercase">
              Inside a session
            </p>
            <h2
              id="session-preview-heading"
              className="font-heading text-foreground mt-2 text-3xl font-semibold tracking-tight"
            >
              What one session actually looks like
            </h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-lg text-lg leading-relaxed">
              You talk through the problem while you write and run real code in the browser.
              Submitting scores you on four criteria, and the problem comes back on a review
              schedule.
            </p>
          </div>

          <figure className="border-border bg-card overflow-hidden rounded-[18px] border">
            <div role="img" aria-label={FIGURE_LABEL}>
              {/* The depiction is one image to assistive tech; its internals are
                  decorative and would otherwise be read as a wall of fragments. */}
              <div aria-hidden="true">
                <div className="border-border bg-muted/30 text-muted-foreground flex items-center justify-between border-b px-4 py-2 text-[10px] font-semibold tracking-[0.1em] uppercase">
                  <span>Live session</span>
                  <span className="normal-case">Bug fix · Python</span>
                </div>

                <div className="grid gap-3 p-3 md:grid-cols-2 md:p-4">
                  <Pane label="Editor">
                    <p className="text-muted-foreground mb-2 font-mono text-[10px]">
                      pricing_rules.py
                    </p>
                    <div className="overflow-hidden font-mono text-[10px] leading-relaxed sm:text-[11px]">
                      <div className="grid grid-cols-[auto_1fr] gap-x-2">
                        {SAMPLE.map((line, i) => (
                          <div key={i} className="contents">
                            <span
                              className="text-right tabular-nums select-none"
                              style={{ color: "var(--gut)" }}
                            >
                              {i + 1}
                            </span>
                            <span className="text-foreground whitespace-pre">
                              {line.map((token, j) => (
                                <Token key={j} token={token} />
                              ))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-neural-strong mt-3 font-mono text-[10px] sm:text-[11px]">
                      › 3 of 4 tests passing
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="border-border text-foreground rounded-md border px-2.5 py-1 text-[11px] font-medium">
                        Run Tests
                      </span>
                      <span className="bg-accent-strong text-accent-foreground rounded-md px-2.5 py-1 text-[11px] font-medium">
                        Submit Fix
                      </span>
                    </div>
                  </Pane>

                  <Pane label="Interviewer">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="bg-accent/15 text-accent-strong ring-accent/30 relative flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ring-1">
                        S
                        <span className="bg-neural border-card absolute right-0 bottom-0 h-2 w-2 rounded-full border-2" />
                      </span>
                      <span>
                        <span className="text-foreground block text-[11px] font-medium">
                          CodeSparring AI
                        </span>
                        <span className="text-muted-foreground block text-[10px]">
                          Sable · reacting live
                        </span>
                      </span>
                    </div>

                    <div className="space-y-2">
                      <ChatBubble from="ai">
                        Before you change anything, what does the failing test actually assert?
                      </ChatBubble>
                      <ChatBubble from="you">
                        It expects the discount after tax. The code applies it before.
                      </ChatBubble>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="bg-accent/10 text-accent-strong inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium">
                        <Mic className="h-3 w-3" />
                        Speaking
                      </span>
                      <span className="bg-secondary border-border text-muted-foreground flex-1 rounded-md border px-2.5 py-1 text-[10px]">
                        Type a question...
                      </span>
                    </div>
                  </Pane>
                </div>

                <div className="border-border flex flex-wrap items-center gap-2 border-t px-4 py-3">
                  <ResultChip>Scored on 4 criteria</ResultChip>
                  <ResultChip emphasis>Communication is 30% of it</ResultChip>
                  <ResultChip>Queued for review</ResultChip>
                </div>
              </div>
            </div>

            <figcaption className="text-muted-foreground border-border border-t px-4 py-3 text-xs leading-relaxed">
              An illustration of a bug-fix session. Every control shown is real: Run Tests, Submit
              Fix, voice or typed replies, and a score across understanding, problem-solving, code
              quality, and communication. Free and Pro run the same session. Pro adds the review
              schedule that brings each problem back before you forget it.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
