import type { Metadata } from "next"
import Link from "next/link"
import { Terminal } from "lucide-react"
import { listLevels } from "@/lib/tutorials/registry"
import { toPathLevelSummary } from "@/lib/tutorials/level-path"
import { LevelSelector } from "@/components/tutorials/LevelSelector"
import { ResumeLearning } from "@/components/tutorials/ResumeLearning"
import { LearnPathTopBar } from "@/components/tutorials/LearnPathTopBar"

export const metadata: Metadata = {
  title: "Learn Python — CodeSparring",
  description:
    "Free interactive Python course that runs in your browser. Read, apply, and practice the exact Python that intern and new-grad SWE and DE interviews test.",
}

const LOOP_PHASES = ["Read", "Apply", "Practice"]

/** Screen 1 — the Python Path. Server Component: static content from `listLevels()`. */
export default function LearnPythonPage() {
  // Project to the lean Path summary so the ~440 KB authored PythonLevel[] (starter code, reference
  // solutions, tests) never serializes into the client bundle — the landing only needs ids + skills.
  const levels = listLevels().map((level) => toPathLevelSummary(level))

  return (
    <>
      <LearnPathTopBar label="Learn Python" />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <header className="mb-12 text-center">
          <p className="text-accent-strong text-xs font-semibold tracking-[0.18em] uppercase">
            Learn Python
          </p>
          <h1 className="text-foreground mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Python, the way real engineers actually learn it
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-pretty">
            Pick a level, then learn every concept the same way: read it, write it, and practice it
            on production-shaped code.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            {LOOP_PHASES.map((phase, i) => (
              <span key={phase} className="flex items-center gap-2">
                <span className="border-accent/30 bg-accent/10 text-accent-strong rounded-full border px-3 py-1 text-sm font-medium">
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

          <ResumeLearning levels={levels} />

          <div className="mt-4 flex justify-center">
            <Link
              href="/python-executor"
              className="border-border text-muted-foreground hover:border-accent/30 hover:text-foreground inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors"
            >
              <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
              Just want to freestyle? Try the Python Executor
            </Link>
          </div>
        </header>

        <LevelSelector levels={levels} />
      </div>
    </>
  )
}
