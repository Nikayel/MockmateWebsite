"use client"

/**
 * Case Lab play surface — `/labs/[labId]`.
 *
 * Loads the lab definition into the store, resumes an in-progress run (or starts
 * a fresh one), and renders the 3-column shell. This is the route that makes a
 * lab fully playable through all five milestones.
 */

import { useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getCaseLabById } from "@/lib/labs/case-labs"
import { useAuth } from "@/lib/auth-context"
import { useCaseLabStore } from "@/lib/stores/case-lab-store"
import { useCaseLabRunSync } from "@/components/labs/useCaseLabRunSync"
import { CaseLabShell } from "@/components/labs/CaseLabShell"
import { CaseLabChat } from "@/components/labs/CaseLabChat"
import { CaseLabIntro } from "@/components/labs/CaseLabIntro"
import { Header } from "@/components/header"
import { trackCaseLabStarted } from "@/lib/labs/case-lab-analytics"

export default function CaseLabPlayPage() {
  const params = useParams<{ labId: string }>()
  const labId = params?.labId ?? ""
  const lab = useMemo(() => getCaseLabById(labId), [labId])

  const { user, initialized } = useAuth()
  const setActiveLab = useCaseLabStore((s) => s.setActiveLab)
  const startRun = useCaseLabStore((s) => s.startRun)
  const activeRun = useCaseLabStore((s) => s.activeRun)
  const isLoading = useCaseLabStore((s) => s.isLoading)

  useEffect(() => {
    if (lab) setActiveLab(lab)
  }, [lab, setActiveLab])

  // Resume an in-progress run for this lab (if any).
  useCaseLabRunSync(lab?.id ?? null)

  const hasRunForLab = Boolean(activeRun && lab && activeRun.caseLabId === lab.id)

  if (!lab) {
    return (
      <main className="bg-background min-h-screen">
        <Header />
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-muted-foreground text-sm">Lab not found.</p>
            <Link href="/labs" className="text-primary text-sm underline">
              Back to labs
            </Link>
          </div>
        </div>
      </main>
    )
  }

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
    return (
      <main className="flex h-screen flex-col gap-3 p-3 sm:p-4">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/labs"
              aria-label="Back to labs"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Link>
            <div className="flex flex-col">
              <h1 className="text-foreground text-sm font-semibold">{lab.title}</h1>
              <p className="text-muted-foreground text-xs capitalize">
                {lab.company} · {lab.role}
              </p>
            </div>
          </div>
        </header>

        {signedOutBanner}

        <CaseLabShell className="flex-1" chatSlot={<CaseLabChat />} />
      </main>
    )
  }

  // Setup screen (intro / loading): show the global nav, like the interview
  // scenario-browse screen.
  return (
    <main className="bg-background min-h-screen">
      <Header />
      <div className="container mx-auto flex max-w-2xl flex-col gap-4 px-4 pt-24 pb-12 sm:pt-28">
        <Link
          href="/labs"
          className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to labs
        </Link>

        {signedOutBanner}

        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <p className="text-muted-foreground text-sm">Loading your progress…</p>
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
  )
}
