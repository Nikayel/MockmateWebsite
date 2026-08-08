"use client"

/**
 * The two research maintenance actions that write data, with the guardrails
 * the old single "Backfill Data" button did not have.
 *
 * Backfill runs a dry run first, shows what it would write, and only then
 * offers a confirmation. The server enforces the same thing (dryRun defaults
 * to true and a live run needs a typed token), so this dialog is the humane
 * path rather than the only defence.
 *
 * Recompute exists because a GET no longer regenerates the aggregate as a side
 * effect of being read. Refreshing the page used to trigger that write
 * silently; now it is a button, and it is audited.
 */

import { useState } from "react"
import type { User } from "firebase/auth"
import { executeAdminAction } from "@/lib/admin"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, Repeat, RefreshCw } from "lucide-react"

const ENDPOINT = "/api/admin/algorithm-research"

interface BackfillPreview {
  usersScanned: number
  usersWithHistory: number
  usersSkippedUnassigned: number
  usersSkippedNoHistory: number
  userStatsWouldWrite: number
  errors: string[]
}

interface ResearchDataActionsProps {
  firebaseUser: User | null
  /** ISO timestamp of the stored aggregate, used to show whether it is stale. */
  aggregateLastUpdated?: string
  /** Called after a write so the page can reload. */
  onCompleted: () => void
}

const ONE_HOUR_MS = 60 * 60 * 1000

export function ResearchDataActions({
  firebaseUser,
  aggregateLastUpdated,
  onCompleted,
}: ResearchDataActionsProps) {
  const [preview, setPreview] = useState<BackfillPreview | null>(null)
  const [busy, setBusy] = useState<"none" | "preview" | "write" | "recompute">("none")
  const [message, setMessage] = useState<string | null>(null)

  const stale =
    !aggregateLastUpdated || Date.now() - new Date(aggregateLastUpdated).getTime() > ONE_HOUR_MS

  const runPreview = async () => {
    setBusy("preview")
    setMessage(null)
    const result = await executeAdminAction<BackfillPreview>(firebaseUser, ENDPOINT, {
      action: "backfill-research",
      dryRun: true,
    })
    setBusy("none")
    if (!result.success || !result.data) {
      setMessage(result.error || "Backfill preview failed")
      return
    }
    setPreview(result.data)
  }

  const confirmWrite = async () => {
    setBusy("write")
    const result = await executeAdminAction(firebaseUser, ENDPOINT, {
      action: "backfill-research",
      dryRun: false,
      confirm: "BACKFILL",
    })
    setBusy("none")
    setPreview(null)
    setMessage(result.success ? result.message || "Backfill complete" : result.error || "Failed")
    if (result.success) onCompleted()
  }

  const recompute = async () => {
    setBusy("recompute")
    setMessage(null)
    const result = await executeAdminAction(firebaseUser, ENDPOINT, { action: "regenerate" })
    setBusy("none")
    setMessage(result.success ? "Aggregate recomputed" : result.error || "Recompute failed")
    if (result.success) onCompleted()
  }

  return (
    <>
      {message && <span className="text-sm text-gray-400">{message}</span>}

      <Button
        onClick={recompute}
        variant="outline"
        disabled={busy !== "none"}
        className={
          stale
            ? "border-yellow-600 text-yellow-400 hover:bg-yellow-900/20"
            : "border-gray-700 text-gray-300 hover:bg-gray-800"
        }
        title={
          stale
            ? "The stored cohort averages are over an hour old. Reading the page no longer refreshes them."
            : "Recompute the stored cohort averages"
        }
      >
        {busy === "recompute" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        {stale ? "Recompute (stale)" : "Recompute"}
      </Button>

      <Button
        onClick={runPreview}
        variant="outline"
        disabled={busy !== "none"}
        className="border-[#c4703f] text-[#c4703f] hover:bg-[#c4703f]/10"
      >
        {busy === "preview" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Repeat className="mr-2 h-4 w-4" />
        )}
        Backfill (dry run)
      </Button>

      <AlertDialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <AlertDialogContent className="border-gray-700 bg-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-100">
              Write derived research summaries?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-gray-400">
                <p>
                  These rows are reconstructed from session and mastery history, not measured. They
                  are written to a separate quarantine collection and are never part of the SM-2 vs
                  FSRS cohorts the verdict is computed from.
                </p>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  <li>
                    <span className="font-medium text-gray-200">
                      {preview?.usersWithHistory ?? 0}
                    </span>{" "}
                    derived summaries would be written
                  </li>
                  <li>
                    <span className="font-medium text-gray-200">
                      {preview?.userStatsWouldWrite ?? 0}
                    </span>{" "}
                    user_stats documents would be rebuilt from real sessions
                  </li>
                  <li>
                    {preview?.usersSkippedUnassigned ?? 0} users have no algorithm assignment and
                    are skipped, never filed under SM-2
                  </li>
                  <li>
                    {preview?.usersSkippedNoHistory ?? 0} users have no history to derive from
                  </li>
                  {(preview?.errors.length ?? 0) > 0 && (
                    <li className="text-red-400">
                      {preview?.errors.length} users errored in the dry run, inspect before
                      proceeding
                    </li>
                  )}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmWrite}
              disabled={busy === "write"}
              className="bg-[#c4703f] text-white hover:bg-[#a85c32]"
            >
              Write to the quarantine collection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
