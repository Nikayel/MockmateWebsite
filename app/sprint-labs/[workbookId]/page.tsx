/**
 * Sprint Labs workbook overview — `/sprint-labs/[workbookId]`.
 *
 * UX-SPEC.md §3, screen 2: the join-the-team moment. Public, static (ISR), indexable, global chrome.
 * The flag check and the unknown-id 404 both live in `layout.tsx`; this file only renders.
 *
 * Fix round 1 (I2+I3): the resume-aware region (top CTA, the arc's `currentSprint`, the repeat CTA)
 * is `WorkbookOverviewShell`, which owns the one client-side run fetch and threads its result to all
 * three render sites — the previous two independent `WorkbookOverviewCta` instances made two
 * authenticated calls for one fact and could show two `SparraLoader`s at once. The grading panel and
 * the objectives-by-sprint list are static and run-independent, so they render on the server and
 * pass straight through the shell as `children`. A capability-locked workbook
 * (`!workbookIsRunnable`) has no CTA and no run at all, so it skips the shell entirely: a plain
 * `SprintMap` with no `currentSprint`, and a static sandbox notice instead of a CTA.
 */

import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MeridianOnboardingGate } from "@/components/sprint-labs/MeridianOnboardingGate"
import { getWorkbookSummary, getWorkbookSprints } from "@/lib/sprint-labs/content/registry"
import {
  workbookIsRunnable,
  SERVER_EXECUTION_MESSAGE,
} from "@/lib/sprint-labs/platform-capabilities"
import { GradingOverviewPanel } from "@/components/sprint-labs/catalog/GradingOverviewPanel"
import { SprintMap } from "@/components/sprint-labs/catalog/SprintMap"
import { WorkbookOverviewShell } from "@/components/sprint-labs/catalog/WorkbookOverviewShell"
import { ObjectiveList } from "@/components/sprint-labs/ui/ObjectiveList"
import { toNotStartedObjectiveView } from "@/components/sprint-labs/ui/objective-view"
import { formatWorkbookMeterLine } from "@/components/sprint-labs/catalog/format-meter-line"

// UX-SPEC.md §1.2/§15.5: static and indexable, with the owner's flag flip landing within five
// minutes rather than requiring a redeploy.
export const revalidate = 300

export default async function SprintLabWorkbookOverviewPage({
  params,
}: {
  params: Promise<{ workbookId: string }>
}) {
  const { workbookId } = await params
  const summary = getWorkbookSummary(workbookId)
  // Defensive: `layout.tsx` already 404s an unknown id before this renders.
  if (!summary) notFound()

  const sprints = (await getWorkbookSprints(workbookId)) ?? []
  const locked = !workbookIsRunnable(summary)

  // Run-independent middle of the page: identical whether the workbook is locked or not, so it is
  // built once and either wrapped by the shell (unlocked) or rendered plain (locked).
  const staticMiddle = (
    <>
      <GradingOverviewPanel />

      <section aria-labelledby="workbook-objectives-heading" className="flex flex-col gap-4">
        <h2
          id="workbook-objectives-heading"
          className="text-lg font-semibold text-[var(--wb-text)] sm:text-xl"
        >
          What you&apos;ll be able to do
        </h2>
        {sprints.length === 0 ? (
          <p className="text-sm text-[var(--wb-faint)]">
            Objectives are not published for this workbook yet.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {sprints.map((sprint) => (
              <ObjectiveList
                key={sprint.number}
                heading={`Sprint ${sprint.number}: ${sprint.title}`}
                density="full"
                objectives={sprint.objectives.map(toNotStartedObjectiveView)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  )

  return (
    <>
      <Header />
      {/* First-run "you're hired" cinematic, Meridian only. Self-gating and client-only, so it never
          touches this static page's HTML; it plays over the page and unmounts on handoff, leaving the
          navbar and workbook underneath. */}
      {summary.id === "meridian" && <MeridianOnboardingGate />}
      <main className="workbook-surface min-h-screen bg-[var(--wb-page)] text-[var(--wb-text)]">
        <div className="container mx-auto flex max-w-[900px] flex-col gap-10 px-4 pt-20 pb-16 sm:pt-24">
          <Link
            href="/labs#sprint-labs"
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--wb-text-secondary)] hover:text-[var(--wb-accent-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to labs
          </Link>

          <header className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <h1 className="text-2xl leading-tight font-bold text-[var(--wb-text)] sm:text-4xl">
                {summary.title}
              </h1>
              <p className="max-w-[70ch] text-sm leading-relaxed text-[var(--wb-text-secondary)] sm:text-base">
                {summary.pitch}
              </p>
            </div>

            {locked && (
              <div className="flex flex-col gap-2 rounded-lg border border-[var(--wb-border)] bg-[var(--wb-panel)] p-4">
                <p className="text-sm text-[var(--wb-text)]">{SERVER_EXECUTION_MESSAGE}</p>
                <p className="text-xs text-[var(--wb-text-secondary)]">
                  {formatWorkbookMeterLine(summary)}
                </p>
              </div>
            )}
          </header>

          {locked ? (
            <>
              {staticMiddle}
              <section aria-labelledby="workbook-arc-heading" className="flex flex-col gap-4">
                <h2
                  id="workbook-arc-heading"
                  className="text-lg font-semibold text-[var(--wb-text)] sm:text-xl"
                >
                  The arc
                </h2>
                {sprints.length === 0 ? (
                  <p className="text-sm text-[var(--wb-faint)]">
                    The sprint map is not published for this workbook yet.
                  </p>
                ) : (
                  <SprintMap sprints={sprints} />
                )}
              </section>
            </>
          ) : (
            <WorkbookOverviewShell
              workbookId={summary.id}
              sprints={sprints}
              meterLine={formatWorkbookMeterLine(summary)}
            >
              {staticMiddle}
            </WorkbookOverviewShell>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
