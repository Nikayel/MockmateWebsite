"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { usePersistentState } from "./usePersistentState"

const PLACEHOLDER = `Paste a problem description here — a LeetCode prompt, an interview
question, your own notes — so you can read it without switching windows while
you write your solution in the editor.`

/**
 * Read-while-you-code problem notes. Paste plain text (e.g. a LeetCode description) and — once you
 * click away (blur) — it renders through the shared `MarkdownRenderer` so headers, examples, and
 * code blocks read cleanly. Content-only (no outer panel chrome) — mounted inside `ExecutorSidePanel`'s
 * "Problem" tab. Text persists to localStorage so a reload keeps the problem on hand (HANDOFF §4);
 * on reload it opens in the (restored) textarea and renders on the next blur.
 */
export function ProblemNotesPanel() {
  const [notes, setNotes] = usePersistentState("cs_pyexec_problem", "")
  const [editing, setEditing] = useState(true)

  if (editing) {
    return (
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => notes.trim() && setEditing(false)}
        placeholder={PLACEHOLDER}
        className="text-foreground placeholder:text-muted-foreground/60 h-full w-full resize-none bg-transparent px-3 py-3 text-sm leading-relaxed outline-none"
      />
    )
  }

  return (
    <div className="group relative h-full overflow-y-auto">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-muted-foreground hover:text-foreground bg-card/90 focus-visible:ring-accent/50 absolute top-2 right-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-none"
      >
        <Pencil className="h-3 w-3" />
        Edit
      </button>
      <div className="prose prose-sm dark:prose-invert max-w-none px-3 py-3">
        <MarkdownRenderer content={notes} />
      </div>
    </div>
  )
}
