"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Pause, Play } from "lucide-react"
import {
  REPLAY_SCRIPT,
  computeReplayState,
  replayChapters,
  type ReplayStep,
} from "@/components/home/replay-script"

interface SessionReplayProps {
  /**
   * "loop": autoplays compressed and restarts forever (hero). "full": real
   * pacing with play/pause and chapter jumps (/rounds).
   */
  mode: "loop" | "full"
  className?: string
}

const LOOP_SPEED = 0.7
const LOOP_RESTART_PAUSE_MS = 2600

/**
 * Plays the authored session in `replay-script.ts` inside a browser-chrome
 * frame: chat on the left, editor plus test results on the right. All state
 * derives from `computeReplayState(script, index)`, so the player itself is
 * only an index on a timer; chapter jumps assign the index. Honesty is part
 * of the frame: the chrome bar carries a permanent "Scripted demo" chip.
 * Reduced motion renders the finished session statically.
 */
export function SessionReplay({ mode, className }: SessionReplayProps) {
  const reduceMotion = useReducedMotion()
  const steps: ReplayStep[] = REPLAY_SCRIPT
  const lastIndex = steps.length - 1
  const [index, setIndex] = useState(reduceMotion ? lastIndex : 0)
  const [playing, setPlaying] = useState(!reduceMotion)
  const chatRef = useRef<HTMLDivElement>(null)

  const state = useMemo(() => computeReplayState(steps, index), [steps, index])
  const chapters = useMemo(() => replayChapters(steps), [steps])
  const activeChapter = useMemo(() => {
    let label = chapters[0]?.label
    for (const chapter of chapters) if (chapter.index <= index) label = chapter.label
    return label
  }, [chapters, index])

  useEffect(() => {
    if (reduceMotion || !playing) return
    if (index >= lastIndex) {
      if (mode !== "loop") return
      const timer = setTimeout(() => setIndex(0), LOOP_RESTART_PAUSE_MS)
      return () => clearTimeout(timer)
    }
    const nextDelay = steps[index + 1].delayMs * (mode === "loop" ? LOOP_SPEED : 1)
    const timer = setTimeout(() => setIndex((i) => i + 1), nextDelay)
    return () => clearTimeout(timer)
  }, [index, playing, reduceMotion, mode, steps, lastIndex])

  // Keep the newest message visible; the pane is a fixed-height window.
  useEffect(() => {
    const pane = chatRef.current
    if (pane) pane.scrollTop = pane.scrollHeight
  }, [state.messages.length])

  return (
    <figure
      aria-label="Scripted demo of a CodeSparring interview session"
      className={`border-border bg-background overflow-hidden rounded-xl border text-left shadow-sm ${className ?? ""}`}
    >
      {/* Chrome bar */}
      <div className="border-border bg-muted/50 flex items-center gap-3 border-b px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="bg-border h-2.5 w-2.5 rounded-full" />
          <span className="bg-border h-2.5 w-2.5 rounded-full" />
          <span className="bg-border h-2.5 w-2.5 rounded-full" />
        </div>
        <span className="text-muted-foreground font-mono text-[11px] tracking-tight">
          codesparring.dev/interview
        </span>
        <span className="border-border text-muted-foreground ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-[0.02em]">
          Scripted demo
        </span>
      </div>

      <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Chat pane */}
        <div
          ref={chatRef}
          className="border-border flex h-[300px] flex-col gap-2.5 overflow-y-auto border-b p-3.5 md:h-[380px] md:border-r md:border-b-0"
        >
          {state.messages.map((message, i) => (
            <motion.div
              key={i}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={message.role === "candidate" ? "self-end" : "self-start"}
            >
              <p
                className={`text-muted-foreground mb-0.5 text-[10px] ${
                  message.role === "candidate" ? "text-right" : ""
                }`}
              >
                {message.role === "candidate" ? "You" : "Interviewer"}
              </p>
              <div
                className={`max-w-[95%] rounded-lg px-3 py-2 text-[13px] leading-5 ${
                  message.role === "candidate"
                    ? "bg-accent/10 text-foreground"
                    : "bg-muted text-foreground/90"
                }`}
              >
                {message.text}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Editor + tests + score */}
        <div className="flex h-[300px] flex-col md:h-[380px]">
          <div className="flex-1 overflow-y-auto p-4" style={{ background: "var(--editor-bg)" }}>
            <pre className="font-mono text-[12.5px] leading-[1.55]">
              {state.codeLines.map((line, i) => (
                <div
                  key={`${index}-${i}`}
                  className={`text-foreground/90 rounded px-1 ${
                    state.highlight.includes(i) ? "bg-accent/15" : ""
                  }`}
                >
                  {line || " "}
                </div>
              ))}
              {state.codeLines.length === 0 && (
                <div className="text-muted-foreground"># solution.py</div>
              )}
            </pre>
          </div>

          <div className="border-border border-t px-3.5 py-2.5">
            {state.tests ? (
              <div className="flex flex-wrap gap-1.5">
                {state.tests.map((test) => (
                  <span
                    key={test.name}
                    className={`rounded-md px-2 py-1 font-mono text-[10.5px] ${
                      test.pass
                        ? "bg-neural/10 text-neural-strong"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {test.pass ? "PASS" : "FAIL"} {test.name}
                    {!test.pass && test.detail ? ` · ${test.detail}` : ""}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground font-mono text-[10.5px]">
                3 tests ready · Run Tests
              </span>
            )}
          </div>

          {state.score && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-border grid grid-cols-3 gap-3 border-t px-3.5 py-2.5"
            >
              {state.score.map((entry) => (
                <div key={entry.label}>
                  <p className="text-muted-foreground text-[10px]">{entry.label}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="bg-muted h-1 flex-1 overflow-hidden rounded-full">
                      <div className="bg-accent h-full" style={{ width: `${entry.value}%` }} />
                    </div>
                    <span className="text-foreground text-[11px] font-semibold">{entry.value}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Full-mode controls: play/pause + chapter jumps */}
      {mode === "full" && (
        <figcaption className="border-border bg-muted/40 flex flex-wrap items-center gap-1.5 border-t px-3.5 py-2.5">
          <button
            type="button"
            onClick={() => {
              if (index >= lastIndex) {
                setIndex(0)
                setPlaying(true)
                return
              }
              setPlaying((p) => !p)
            }}
            aria-label={playing && index < lastIndex ? "Pause replay" : "Play replay"}
            className="border-border text-foreground hover:bg-muted inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors"
          >
            {playing && index < lastIndex ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </button>
          {chapters.map((chapter) => (
            <button
              key={chapter.label}
              type="button"
              onClick={() => {
                setIndex(chapter.index)
                setPlaying(true)
              }}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                activeChapter === chapter.label
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {chapter.label}
            </button>
          ))}
        </figcaption>
      )}
    </figure>
  )
}
