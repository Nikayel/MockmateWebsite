import { cn } from "@/lib/utils"

/**
 * A small, non-interactive "faux code-window" used in the Python Path preview (HANDOFF §B).
 * Renders window chrome + a gutter + token-colored source. Colors come from the theme-aware
 * `--kw/--str/--com/--fn/--num/--gut` CSS vars, so the sample recolors in step with the global
 * light↔dark crossfade (HANDOFF §E) — no syntax engine, the tokens are authored per level.
 */
export type SyntaxKind = "kw" | "str" | "com" | "fn" | "num" | "plain"

export interface CodeToken {
  kind: SyntaxKind
  text: string
}

/** One source line is a list of tokens; an empty list renders as a blank line. */
export type CodeLine = CodeToken[]

const KIND_VAR: Record<Exclude<SyntaxKind, "plain">, string> = {
  kw: "var(--kw)",
  str: "var(--str)",
  com: "var(--com)",
  fn: "var(--fn)",
  num: "var(--num)",
}

// Authoring helpers — keep per-level sample arrays compact and readable.
export const k = (text: string): CodeToken => ({ kind: "kw", text })
export const s = (text: string): CodeToken => ({ kind: "str", text })
export const c = (text: string): CodeToken => ({ kind: "com", text })
export const fn = (text: string): CodeToken => ({ kind: "fn", text })
export const num = (text: string): CodeToken => ({ kind: "num", text })
export const p = (text: string): CodeToken => ({ kind: "plain", text })

export function CodeWindow({
  filename,
  lines,
  className,
}: {
  filename: string
  lines: CodeLine[]
  className?: string
}) {
  return (
    <div
      className={cn("border-border bg-card overflow-hidden rounded-xl border shadow-sm", className)}
    >
      <div className="border-border bg-muted/40 flex items-center gap-2 border-b px-3 py-2">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#e0695f]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e0b15a]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#6fcf9f]" />
        </span>
        <span className="text-muted-foreground ml-1 font-mono text-xs">{filename}</span>
      </div>

      <pre className="overflow-x-auto px-3 py-3 font-mono text-[12.5px] leading-relaxed">
        <code className="grid grid-cols-[auto_1fr] gap-x-3">
          {lines.map((line, i) => (
            <div key={i} className="contents">
              <span
                className="text-right tabular-nums select-none"
                style={{ color: "var(--gut)" }}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <span className="text-foreground whitespace-pre">
                {line.length === 0
                  ? " "
                  : line.map((tok, j) => (
                      <span
                        key={j}
                        style={tok.kind === "plain" ? undefined : { color: KIND_VAR[tok.kind] }}
                      >
                        {tok.text}
                      </span>
                    ))}
              </span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  )
}
