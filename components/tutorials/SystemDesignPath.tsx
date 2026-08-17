"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Check, ChevronDown } from "lucide-react"
import { SystemDesignLevelPreview } from "./SystemDesignLevelPreview"
import { useCompletedLessons } from "./useCompletedLessons"
import { groupSystemDesignLevels } from "@/lib/tutorials/system-design/sections"
import { levelPath, lessonWorkspacePath, publicLessonPath } from "@/lib/tutorials/lesson-routes"
import { useAuth } from "@/lib/auth-context"
import type { PathLevelSummary } from "@/lib/tutorials/level-path"

/**
 * Screen 1 — the System Design Path (HANDOFF-LearnPython §B, ported to this course).
 *
 * A sticky level preview on the left, and on the right the twelve levels grouped into five
 * collapsible arcs, each a numbered spine. The preview reacts to the level under the pointer or the
 * keyboard focus.
 *
 * ## Why the arcs are a native <details> and not a client-state accordion
 *
 * Because the level links have to survive being collapsed. An accordion that renders its list only
 * when open would take twelve `<a href>`s out of the server HTML on a page whose entire job is to be
 * the index for those twelve levels and the 208 lessons under them. `<details>` keeps the whole list
 * in the DOM, works with no JavaScript, and is keyboard- and screen-reader-native for free.
 *
 * ## Why the node is a LINK and the preview follows hover, rather than §B's click-to-select
 *
 * On the Python Path a level card is a `<button>` that selects, and the preview's CTA does the
 * navigating. Copying that here would have deleted twelve `<a href>`s from a page that is one of the
 * site's indexed traffic surfaces, and the level indexes underneath it are reached almost entirely
 * through this list. So the card stays exactly what it is today, a real link to the level index that
 * is in the server HTML and works with no JavaScript, and the preview is layered on top as pure
 * enhancement: hover or focus updates it, and it is not rendered at all below `lg` where there is no
 * hover to speak of. Every fact the panel shows is also on the card or one click away.
 *
 * Completion is hydrated best-effort from saved progress (empty when signed out), so a signed-out
 * visitor sees a clean index rather than a zeroed progress readout.
 */
export function SystemDesignPath({ levels }: { levels: PathLevelSummary[] }) {
  const completed = useCompletedLessons()
  const { user, initialized } = useAuth()
  const signedIn = initialized && Boolean(user)

  const [activeId, setActiveId] = useState<number>(levels[0]?.id ?? 0)
  // A pointer or a Tab key beats the resume guess below; once the visitor has aimed at a level, the
  // panel stops second-guessing them.
  const chosen = useRef(false)

  const arcs = useMemo(() => groupSystemDesignLevels(levels), [levels])

  const completedIn = (level: PathLevelSummary) =>
    level.lessons.filter((lesson) => completed.has(lesson.id)).length

  // Once progress loads, point the panel at the level the learner is actually in the middle of.
  // Only ever runs for someone with saved progress: with none, `completed` stays empty and the panel
  // keeps its first-level default.
  useEffect(() => {
    if (chosen.current || completed.size === 0) return
    const resume = levels.find(
      (level) =>
        level.lessons.length > 0 && level.lessons.some((lesson) => !completed.has(lesson.id))
    )
    if (resume) setActiveId(resume.id)
  }, [completed, levels])

  const active = levels.find((level) => level.id === activeId) ?? levels[0]

  /** The level's first unfinished lesson (a "continue"), else its first. */
  const entryHref = (level: PathLevelSummary): string => {
    const next = level.lessons.find((lesson) => !completed.has(lesson.id)) ?? level.lessons[0]
    if (!next) return levelPath("system-design", level.slug)
    return signedIn
      ? lessonWorkspacePath("system-design", level.slug, next.id)
      : publicLessonPath("system-design", level.slug, next.id)
  }

  if (!active) return null

  return (
    // Preview LEFT, levels RIGHT, and the preview is also first in the DOM so reading order and
    // focus order agree with what the eye sees (WCAG 2.4.3). Below `lg` the preview is not rendered
    // at all, so the levels are the first thing on a phone either way.
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(340px,400px)_1fr] lg:gap-10">
      {/* Desktop only. Below `lg` there is no hover to drive it and no column to park it in, and
          every fact it carries is already on the card. */}
      <div className="hidden lg:sticky lg:top-24 lg:block">
        <SystemDesignLevelPreview
          level={active}
          href={entryHref(active)}
          completedCount={completedIn(active)}
        />
      </div>

      <div className="flex flex-col gap-3">
        {arcs.map(({ section, levels: arcLevels }, arcIndex) => (
          // A native <details>, not a client-state accordion, and that is the load-bearing choice:
          // the twelve level links stay in the server HTML whether or not the arc is open, so a
          // crawler and a JS-disabled reader still get the whole course. Conditionally rendering the
          // list would delete those links from the initial HTML, which is the one regression this
          // page cannot afford (and which system-design-path.test.tsx fails on).
          <details
            key={section.id}
            open={arcIndex === 0}
            className="group border-border bg-card/40 rounded-xl border"
          >
            <summary className="hover:bg-accent/[0.03] focus-visible:ring-accent/50 flex cursor-pointer list-none items-start gap-3 rounded-xl p-5 transition-colors marker:content-none focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <ChevronDown
                className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-accent-strong text-xs font-semibold tracking-[0.18em] uppercase">
                  {section.title}
                </h2>
                <p className="text-muted-foreground mt-1.5 text-sm text-pretty">{section.blurb}</p>
                <p className="text-muted-foreground mt-2 text-xs">
                  {arcLevels.length} {arcLevels.length === 1 ? "level" : "levels"}
                  {" · "}
                  {arcLevels.reduce((total, level) => total + level.lessons.length, 0)} lessons
                </p>
              </div>
            </summary>

            <ol className="px-5 pb-5">
              {arcLevels.map((level, indexInArc) => {
                const lessonCount = level.lessons.length
                const doneCount = completedIn(level)
                const isComplete = lessonCount > 0 && doneCount === lessonCount
                const isActive = level.id === active.id

                return (
                  <li key={level.id} className="flex gap-4">
                    <div className="flex w-9 shrink-0 flex-col items-center">
                      <span
                        className={[
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                          isComplete
                            ? "bg-accent text-accent-foreground border-transparent"
                            : isActive
                              ? "border-accent text-accent-strong bg-accent/10"
                              : "border-border text-muted-foreground",
                        ].join(" ")}
                        aria-hidden="true"
                      >
                        {level.id}
                      </span>
                      {/* The spine now runs WITHIN an arc, not across all twelve. Once an arc can be
                          closed there is no line to continue into, so a cross-arc connector would be
                          drawing a path to something that is not on screen. */}
                      {indexInArc < arcLevels.length - 1 && (
                        <span
                          className={[
                            "my-2 w-px flex-1 transition-colors",
                            isComplete ? "bg-accent" : "bg-border",
                          ].join(" ")}
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    {/* No `Reveal` here, deliberately, though §E asks for reveal-on-scroll and the
                        Python Path uses it on exactly this element. `Reveal` starts its children at
                        `opacity-0` and animates them in after mount, which is fine for a decorative
                        band and wrong for the twelve links that ARE this page: with no JavaScript
                        the whole course would render invisible. The arcs carry the page's rhythm
                        instead. */}
                    <div className="min-w-0 flex-1 pb-4">
                      <Link
                        href={levelPath("system-design", level.slug)}
                        onMouseEnter={() => {
                          chosen.current = true
                          setActiveId(level.id)
                        }}
                        onFocus={() => {
                          chosen.current = true
                          setActiveId(level.id)
                        }}
                        className={[
                          "group focus-visible:ring-accent/50 block rounded-xl border p-5 transition-colors focus-visible:ring-2 focus-visible:outline-none",
                          isActive
                            ? "border-border bg-card lg:border-accent/50 lg:bg-accent/[0.06] lg:shadow-sm"
                            : "border-border bg-card hover:border-accent/40 hover:bg-accent/[0.03]",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-foreground min-w-0 font-semibold text-balance">
                            {level.title}
                          </h3>
                          {isComplete && (
                            <span
                              className="bg-accent text-accent-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                              aria-label="Level complete"
                            >
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-1 text-sm text-pretty">
                          {level.tagline}
                        </p>
                        <p className="text-muted-foreground mt-3 text-xs">
                          {lessonCount === 0
                            ? "Lessons coming soon"
                            : `${lessonCount} ${lessonCount === 1 ? "lesson" : "lessons"}`}{" "}
                          · ~{level.estimatedHours}h
                          {doneCount > 0 && (
                            <span className="text-accent-strong font-medium">
                              {" · "}
                              {doneCount}/{lessonCount} done
                            </span>
                          )}
                        </p>
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ol>
          </details>
        ))}
      </div>
    </div>
  )
}
