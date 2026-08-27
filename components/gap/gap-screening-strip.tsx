"use client"

import { useEffect, useId, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { SCREENING_SLIDES } from "@/lib/landing/gap-tickets"

const SLIDE_MS = 7000

/**
 * GapScreeningStrip — the collapsed "screening round" disclosure.
 *
 * Collapsed by default (HANDOFF-GapSection.md §4): a single 38px row states
 * the claim in one line. Opening it reveals three solved-in-Python slides
 * that autoplay only while the panel is open — nothing animates in the
 * default view, and the interval is never created until expansion.
 */
export function GapScreeningStrip() {
  const reduceMotion = useReducedMotion()
  const panelId = useId()
  const [expanded, setExpanded] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)

  useEffect(() => {
    if (!expanded || reduceMotion) return
    const id = setInterval(() => {
      setSlideIndex((i) => (i + 1) % SCREENING_SLIDES.length)
    }, SLIDE_MS)
    return () => clearInterval(id)
  }, [expanded, reduceMotion])

  const slide = SCREENING_SLIDES[slideIndex]

  return (
    <div className="border-border overflow-hidden rounded-[6px] border">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="hover:bg-muted flex h-[38px] w-full items-center gap-2.5 px-3.5 text-left transition-colors"
      >
        <Check className="text-neural-strong h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="text-muted-foreground shrink-0 font-mono text-[9.5px] font-bold tracking-[0.13em] uppercase">
          Screening round
        </span>
        <span className="text-muted-foreground truncate font-mono text-[10.5px] font-medium">
          An LLM clears these in seconds. You still have to understand them.
        </span>
        <span className="text-foreground ml-auto flex shrink-0 items-center gap-1 text-[12.5px] font-medium">
          {expanded ? "Hide" : "See one"}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              expanded && "rotate-180"
            )}
            aria-hidden
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={panelId}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
            className="border-border overflow-hidden border-t"
          >
            <div className="p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-muted-foreground text-[12px] font-medium">
                  The basics — still worth knowing cold
                </p>
                <div
                  role="group"
                  aria-label="Screening round examples"
                  className="flex shrink-0 items-center gap-1.5"
                >
                  {SCREENING_SLIDES.map((s, i) => (
                    <button
                      key={s.filename}
                      type="button"
                      aria-pressed={i === slideIndex}
                      aria-label={`Show ${s.filename}`}
                      onClick={() => setSlideIndex(i)}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full transition-colors",
                        i === slideIndex ? "bg-accent" : "bg-border hover:bg-muted-foreground/40"
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,300px)_1fr]">
                <div className="bg-editor-bg border-border overflow-hidden rounded-[6px] border">
                  <div className="border-border flex items-center justify-between border-b px-3 py-2">
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {slide.filename}
                    </span>
                    <span className="text-neural-strong text-[10px] font-semibold">✓ Accepted</span>
                  </div>
                  <div className="h-[230px] overflow-auto">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.pre
                        key={slideIndex}
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reduceMotion ? undefined : { opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="p-3 font-mono text-[11.5px] leading-relaxed"
                      >
                        <code className="grid grid-cols-[auto_1fr] gap-x-3">
                          {slide.lines.map((line, i) => (
                            <div key={i} className="contents">
                              <span
                                className="text-right tabular-nums select-none"
                                style={{ color: "var(--gut)" }}
                                aria-hidden
                              >
                                {i + 1}
                              </span>
                              <span className="text-foreground whitespace-pre">
                                {line.length === 0
                                  ? " "
                                  : line.map((tok, j) => (
                                      <span
                                        key={j}
                                        style={
                                          tok.kind === "plain"
                                            ? undefined
                                            : { color: `var(--${tok.kind})` }
                                        }
                                      >
                                        {tok.text}
                                      </span>
                                    ))}
                              </span>
                            </div>
                          ))}
                        </code>
                      </motion.pre>
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex flex-col justify-center gap-3">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-muted-foreground w-[85px] shrink-0 text-[11px] tracking-wide uppercase">
                      your runtime
                    </span>
                    <span className="text-foreground font-mono text-sm font-semibold">0 ms</span>
                  </div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-muted-foreground w-[85px] shrink-0 text-[11px] tracking-wide uppercase">
                      an LLM
                    </span>
                    <span className="text-foreground font-mono text-sm font-semibold">
                      9s, first try
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
                    <strong className="text-foreground font-semibold">
                      what it proved — in 2019.
                    </strong>{" "}
                    That you could hold an algorithm in your head under time pressure. It was a real
                    signal, and it was a good one.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default GapScreeningStrip
