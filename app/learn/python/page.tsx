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
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <header className="mb-12 text-center">
        <p className="text-accent text-xs font-semibold tracking-[0.18em] uppercase">
          Learn Python
        </p>
        <h1 className="text-foreground mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          The way real engineers actually learn a language
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-pretty">
          Pick a level, then learn every concept the same way: read it, write it, and practice it on
          production-shaped code.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          {LOOP_PHASES.map((phase, i) => (
            <span key={phase} className="flex items-center gap-2">
              <span className="border-accent/30 bg-accent/10 text-accent rounded-full border px-3 py-1 text-sm font-medium">
                {phase}
              </span>
              {i < LOOP_PHASES.length - 1 && (
                <span className="text-accent/60" aria-hidden="true">
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
