import type { Metadata } from "next"
import { listLevels } from "@/lib/tutorials/registry"
import { LevelSelector } from "@/components/tutorials/LevelSelector"

export const metadata: Metadata = {
  title: "Learn Python — CodeSparring",
  description:
    "Learn Python the way real engineers work: pick a level, then Read → Apply → Practice every concept.",
}

const LOOP_PHASES = ["Read", "Apply", "Practice"]

/** Screen 1 — the Python Path. Server Component: static content from `listLevels()`. */
export default function LearnPythonPage() {
  const levels = listLevels()

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight">Learn Python</h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-xl">
          Pick a level, then learn every concept the same way: read it, write it, and practice it on
          production-shaped code.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          {LOOP_PHASES.map((phase, i) => (
            <span key={phase} className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium">
                {phase}
              </span>
              {i < LOOP_PHASES.length - 1 && (
                <span className="text-muted-foreground" aria-hidden="true">
                  →
                </span>
              )}
            </span>
          ))}
        </div>
      </header>

      <LevelSelector levels={levels} />
    </div>
  )
}
