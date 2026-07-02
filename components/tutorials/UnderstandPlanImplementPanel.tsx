"use client"

import { useState } from "react"
import { usePersistentState } from "./usePersistentState"

/**
 * The classic interview problem-solving scratchpad: Understand → Plan → Implement. Three fillable
 * sections the user steps through while working a problem — restate it, sketch an approach, then
 * jot implementation notes (pseudocode, gotchas) alongside the real code in the editor. Each
 * section's text persists to localStorage, so switching steps (and reloading) never loses anything.
 * Content-only (no outer panel chrome) — mounted inside `ExecutorSidePanel`'s "Scratchpad" tab.
 */
type Step = "understand" | "plan" | "implement"

const STEPS: { key: Step; label: string; placeholder: string }[] = [
  {
    key: "understand",
    label: "Understand",
    placeholder:
      "Restate the problem in your own words. What are the inputs and outputs? What are the edge cases?",
  },
  {
    key: "plan",
    label: "Plan",
    placeholder:
      "What's your approach? Which data structures or algorithm? What's the time/space complexity?",
  },
  {
    key: "implement",
    label: "Implement",
    placeholder:
      "Notes while you code — pseudocode, what you tried, where you got stuck. Write the real code in the editor.",
  },
]

export function UnderstandPlanImplementPanel() {
  const [active, setActive] = useState<Step>("understand")
  // One persistent field per step. Hook calls are unconditional + fixed-order (rules-of-hooks safe).
  const fields: Record<Step, [string, (value: string) => void]> = {
    understand: usePersistentState("cs_pyexec_understand", ""),
    plan: usePersistentState("cs_pyexec_plan", ""),
    implement: usePersistentState("cs_pyexec_implement", ""),
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-1 px-2 pt-2">
        {STEPS.map((step, i) => {
          const isActive = active === step.key
          const isFilled = fields[step.key][0].trim().length > 0
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => setActive(step.key)}
              aria-current={isActive ? "step" : undefined}
              className={[
                "focus-visible:ring-accent/50 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                isActive
                  ? "border-accent/50 bg-accent/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
                  isFilled ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                ].join(" ")}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              {step.label}
            </button>
          )
        })}
      </div>

      {STEPS.map((step) => {
        if (step.key !== active) return null
        const [value, setValue] = fields[step.key]
        return (
          <textarea
            key={step.key}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={step.placeholder}
            className="text-foreground placeholder:text-muted-foreground/60 mt-2 min-h-0 flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-relaxed outline-none"
          />
        )
      })}
    </div>
  )
}
