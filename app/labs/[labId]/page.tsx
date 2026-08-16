"use client"

/**
 * Case Lab play surface — `/labs/[labId]`.
 *
 * Loads the lab definition into the store, resumes an in-progress run (or starts
 * a fresh one), and renders the 3-column shell. This is the route that makes a
 * lab fully playable through all five milestones.
 */

import { useEffect, useMemo, useState } from "react"
import { notFound, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getCaseLabById } from "@/lib/labs/case-labs"
import { useAuth } from "@/lib/auth-context"
import { MILESTONE_ORDER, useCaseLabStore } from "@/lib/stores/case-lab-store"
import { useCaseLabRunSync } from "@/components/labs/useCaseLabRunSync"
import { CaseLabShell } from "@/components/labs/CaseLabShell"
import { CaseLabChat } from "@/components/labs/CaseLabChat"
import { CaseLabIntro } from "@/components/labs/CaseLabIntro"
import { OnsiteTimer } from "@/components/labs/OnsiteTimer"
import { CompanyLogo } from "@/components/labs/CompanyLogo"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Header } from "@/components/header"
import { trackCaseLabStarted, trackCaseLabViewed } from "@/lib/labs/case-lab-analytics"
import { SparraLoader } from "@/components/brand/SparraLoader"

export default function CaseLabPlayPage() {
  const params = useParams<{ labId: string }>()
  const labId = params?.labId ?? ""
  const lab = useMemo(() => getCaseLabById(labId), [labId])

  const { user, initialized } = useAuth()
  const setActiveLab = useCaseLabStore((s) => s.setActiveLab)
  const startRun = useCaseLabStore((s) => s.startRun)
  const reset = useCaseLabStore((s) => s.reset)
  const activeRun = useCaseLabStore((s) => s.activeRun)
  const isLoading = useCaseLabStore((s) => s.isLoading)
  const loadError = useCaseLabStore((s) => s.error)
  const setError = useCaseLabStore((s) => s.setError)

  // PF-15: "Start over" returns to the intro (re-pick mode, fresh run) so a
  // relaxed Practice pass can be cleanly re-run under Onsite before the interview.
  const [confirmRestart, setConfirmRestart] = useState(false)

  useEffect(() => {
    if (lab) setActiveLab(lab)
  }, [lab, setActiveLab])

  // Middle of the lab funnel: opened the lab, has not started a run yet. Keyed on the id so it fires
  // once per lab rather than once per store update.
  const labCompany = lab?.company
  useEffect(() => {
    if (labId && labCompany) trackCaseLabViewed({ labId, company: labCompany })
  }, [labId, labCompany])

  // Resume an in-progress run for this lab (if any). `reload` retries after a
  // failed/timed-out resume load.
  const { reload } = useCaseLabRunSync(lab?.id ?? null)

  const hasRunForLab = Boolean(activeRun && lab && activeRun.caseLabId === lab.id)

  // An unknown id is a 404, not a page. The layout rejects it server-side (`dynamicParams = false`
  // plus its own `notFound()`), so this is a type guard that should never fire; it defers to the
  // real not-found boundary rather than rendering a bespoke "Lab not found" panel, which is what
  // used to answer HTTP 200 with an indexable head for any string in the URL.
  if (!lab) notFound()

  const signedOutBanner = initialized && !user && (
    <div
      className="border-border bg-muted/40 text-muted-foreground flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
      role="status"
    >
      <span>You&apos;re not signed in — your progress and feedback won&apos;t be saved.</span>
      <Link href="/login" className="text-primary font-medium underline">
        Sign in
      </Link>
    </div>
  )

  // Focused workspace: full-height shell, compact in-app header, no global nav
  // (mirrors /interview hiding the marketing Header during an active session).
  if (hasRunForLab) {
    const current = activeRun?.currentMilestone ?? null
    const milestoneNumber = current ? MILESTONE_ORDER.indexOf(current) + 1 : 1
    return (
      <main className="case-lab-workbook flex h-screen flex-col bg-[var(--wb-page)] text-[var(--wb-text)]">
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[var(--wb-border)] bg-[var(--wb-topbar)] px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/labs"
              aria-label="Back to labs"
              className="shrink-0 text-[var(--wb-muted)] hover:text-[var(--wb-text)]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Link>
            <CompanyLogo company={lab.company} size="sm" className="shrink-0" />
            <h1 className="truncate text-[14px] font-medium text-[var(--wb-text)]">{lab.title}</h1>
            <span className="shrink-0 text-[11px] text-[var(--wb-muted)] capitalize">
              {lab.role}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {activeRun?.mode === "onsite" && (
              <OnsiteTimer startedAt={activeRun.startedAt} budgetMinutes={lab.estimatedMinutes} />
            )}
            {confirmRestart ? (
              <span className="flex items-center gap-1.5 text-[12px]">
                <span className="text-[var(--wb-muted)]">Start over?</span>
                <button
                  type="button"
                  onClick={() => {
                    reset()
                    setConfirmRestart(false)
                  }}
                  className="font-medium text-[var(--wb-accent-strong)] hover:underline"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRestart(false)}
                  className="text-[var(--wb-muted)] hover:text-[var(--wb-text)]"
                >
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRestart(true)}
                className="text-[12px] text-[var(--wb-muted)] hover:text-[var(--wb-text)]"
              >
                Start over
              </button>
            )}
            <span className="text-[12px] text-[var(--wb-muted)]">
              Milestone {milestoneNumber} of {MILESTONE_ORDER.length}
            </span>
            <ThemeToggle />
          </div>
        </header>

        {signedOutBanner && <div className="shrink-0 px-4 pt-2">{signedOutBanner}</div>}

        <CaseLabShell className="min-h-0 flex-1" chatSlot={<CaseLabChat />} />
      </main>
    )
  }

  // Setup screen (intro / loading): the global nav stays outside the workbook
  // scope (so it keeps the app's dark chrome), while the content surface itself
  // is the light-by-default workbook — the "first window" the candidate sees.
  return (
    <>
      <Header />
      <main className="case-lab-workbook min-h-screen bg-[var(--wb-page)] text-[var(--wb-text)]">
        <div className="container mx-auto flex max-w-2xl flex-col gap-4 px-4 pt-24 pb-12 sm:pt-28">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/labs"
              className="flex w-fit items-center gap-1 text-sm text-[var(--wb-muted)] hover:text-[var(--wb-text)]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to labs
            </Link>
            <ThemeToggle />
          </div>

          {signedOutBanner}

          {isLoading ? (
            <SparraLoader className="min-h-[40vh]" label="Loading your progress…" />
          ) : loadError ? (
            <div
              className="border-border bg-muted/30 flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-xl border p-6 text-center"
              role="alert"
            >
              <div className="flex flex-col gap-1">
                <p className="text-foreground text-sm font-medium">
                  Couldn&apos;t load your saved progress
                </p>
                <p className="text-muted-foreground text-sm">
                  The connection timed out. Retry, or start without resuming.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={reload}
                  className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="border-border text-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
                >
                  Start without resuming
                </button>
              </div>
            </div>
          ) : (
            <CaseLabIntro
              lab={lab}
              onStart={(mode) => {
                trackCaseLabStarted({ labId: lab.id, company: lab.company, mode })
                startRun(lab, mode)
              }}
            />
          )}
        </div>
      </main>
    </>
  )
}
