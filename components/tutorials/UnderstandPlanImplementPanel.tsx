"use client"

import { useState } from "react"

/**
 * The classic interview problem-solving scratchpad: Understand → Plan → Implement. Three fillable
 * sections the user steps through while working a problem — restate it, sketch an approach, then
 * jot implementation notes (pseudocode, gotchas) alongside the real code in the editor. Each
 * section's text is kept in local state so switching steps doesn't lose anything already written.
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
  const [text, setText] = useState<Record<Step, string>>({
    understand: "",
    plan: "",
    implement: "",
  })

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-1 px-2 pt-2">
        {STEPS.map((step, i) => {
          const isActive = active === step.key
          const isFilled = text[step.key].trim().length > 0
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

      {STEPS.map((step) =>
        step.key === active ? (
          <textarea
            key={step.key}
            value={text[step.key]}
            onChange={(e) => setText((prev) => ({ ...prev, [step.key]: e.target.value }))}
            placeholder={step.placeholder}
            className="text-foreground placeholder:text-muted-foreground/60 mt-2 min-h-0 flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-relaxed outline-none"
          />
        ) : null
      )}
    </div>
  )
}
