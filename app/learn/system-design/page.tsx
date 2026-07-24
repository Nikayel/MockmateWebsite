import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Network } from "lucide-react"
import { listSystemDesignLevels } from "@/lib/tutorials/system-design/registry"
import { LearnPathTopBar } from "@/components/tutorials/LearnPathTopBar"

export const metadata: Metadata = {
  title: "Learn System Design — CodeSparring",
  description:
    "Learn system design the way real interviews test it: pick a level, then Read → Design every concept by writing a free-response answer and self-comparing against a model answer.",
}

const LOOP_PHASES = ["Read", "Design"]

/** Screen 1 — the System-Design Path. Server Component: static content from `listSystemDesignLevels()`. */
export default function LearnSystemDesignPage() {
  const levels = listSystemDesignLevels()

  return (
    <>
      <LearnPathTopBar label="Learn System Design" containerClass="max-w-4xl" />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        <header className="mb-10 text-center">
          <p className="text-accent-strong text-xs font-semibold tracking-[0.18em] uppercase">
            Learn System Design
          </p>
          <h1 className="text-foreground mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            System design, the way real interviews test it
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-pretty">
            Pick a level, then learn every concept the same way: read it, then write your own design
            answer and self-compare against a model answer. No code to run, just the reasoning that
            wins rounds.
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
        </header>

        {/* 60-second demo tour: one tap into each interactive kind (see
            docs/system-design-curriculum/DEMO-PLAYLIST.md). Fully client-side lessons. */}
        <nav
          aria-label="Demo tour"
          className="border-accent/30 bg-accent/[0.05] mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3"
        >
          <span className="text-accent-strong text-xs font-semibold tracking-wide uppercase">
            60-second tour
          </span>
          {[
            {
              href: "/learn/system-design/interview-method/sd-l0-fermi-estimation",
              label: "Drive the QPS math",
            },
            {
              href: "/learn/system-design/interview-method/sd-l0-clarify-scope",
              label: "Predict, then reveal",
            },
            {
              href: "/learn/system-design/scaling-data/sd-l3-consistent-hashing",
              label: "Break a hash ring",
            },
          ].map((stop) => (
            <Link
              key={stop.href}
              href={stop.href}
              className="text-foreground/90 hover:text-accent-strong inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
            >
              {stop.label}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ))}
        </nav>

        <ol className="flex flex-col gap-4">
          {levels.map((level) => {
            const lessonCount = level.modules.reduce((total, mod) => total + mod.lessons.length, 0)
            const comingSoon = lessonCount === 0
            return (
              <li key={level.id}>
                <Link
                  href={`/learn/system-design/${level.slug}`}
                  className="group border-border bg-card hover:border-accent/40 hover:bg-accent/[0.03] flex items-start gap-4 rounded-xl border p-5 transition-colors"
                >
                  <span
                    className="border-accent/30 text-accent-strong bg-accent/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold"
                    aria-hidden="true"
                  >
                    {level.id}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-foreground flex items-center gap-2 font-semibold">
                      <Network className="text-accent h-4 w-4 shrink-0" aria-hidden="true" />
                      {level.title}
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm">{level.tagline}</p>
                    <p className="text-muted-foreground mt-2 text-xs">
                      {comingSoon
                        ? "Lessons coming soon"
                        : `${lessonCount} ${lessonCount === 1 ? "lesson" : "lessons"}`}{" "}
                      · ~{level.estimatedHours}h
                    </p>
                  </div>
                  <ArrowRight className="text-muted-foreground group-hover:text-foreground mt-1 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            )
          })}
        </ol>
      </div>
    </>
  )
}
