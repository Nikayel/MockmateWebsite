"use client"

import { usePersistentState } from "./usePersistentState"

/**
 * The optional working-notes tiers for the Python Executor: **Understand** over **Plan**. Both are
 * editable at once (no tabs) and each persists to localStorage. Deliberately just two tiers — the
 * old "Implement" step is dropped; you implement in the editor, not a notes box. Content-only; it's
 * mounted inside `ExecutorSidePanel`'s collapsible Notes column. Sublabels use `text-muted-foreground`
 * (AA on the card) rather than a fainter tone (HANDOFF-UX §6).
 */
const TIERS = [
  {
    storageKey: "cs_pyexec_understand",
    label: "Understand",
    sublabel: "what's asked",
    placeholder: "Restate the problem. Inputs, outputs, edge cases, constraints.",
  },
  {
    storageKey: "cs_pyexec_plan",
    label: "Plan",
    sublabel: "how you'll solve it",
    placeholder: "Your approach — data structures, algorithm, time/space complexity.",
  },
]

export function NotesPanel() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {TIERS.map((tier, i) => (
        <NotesTier key={tier.storageKey} {...tier} topBorder={i > 0} />
      ))}
    </div>
  )
}

function NotesTier({
  storageKey,
  label,
  sublabel,
  placeholder,
  topBorder,
}: {
  storageKey: string
  label: string
  sublabel: string
  placeholder: string
  topBorder: boolean
}) {
  const [value, setValue] = usePersistentState(storageKey, "")
  return (
    <div className={`flex min-h-0 flex-1 flex-col ${topBorder ? "border-border border-t" : ""}`}>
      <div className="flex shrink-0 items-baseline gap-2 px-3 pt-2.5 pb-1">
        <span className="text-foreground text-xs font-semibold">{label}</span>
        <span className="text-muted-foreground text-[11px]">{sublabel}</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="text-foreground placeholder:text-muted-foreground/70 min-h-0 flex-1 resize-none bg-transparent px-3 pb-3 text-sm leading-relaxed outline-none"
      />
    </div>
  )
}
