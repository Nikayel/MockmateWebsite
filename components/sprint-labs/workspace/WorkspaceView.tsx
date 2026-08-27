"use client"

/**
 * WorkspaceView — the workspace screen's body (UX-SPEC.md §7, PLAN.md Task 12): read the repo, edit
 * the unlocked files, run the visible tests, and talk to Sable under the ticket's policy.
 *
 * Composition, not reinvention: `WorkspaceFileTabs` (file tree), `CodeMirrorEditor` +
 * `CodeMirrorErrorBoundary` (the active file), `CodeConsole` (visible-test results),
 * `TurnStateStrip` (Layer D), `PartnerChat` + `AgentKnowledgePanel` (Task 14, mounted here with the
 * ticket/run context and the live-state seams they were built to accept), `useSprintLabRunSync`
 * (Task 6's autosave, reused verbatim), `AiPolicyBanner` (Task 11's).
 *
 * CONTENT GAP (see `lib/sprint-labs/workspace/tree.ts`'s header, restated here because it is this
 * component's single biggest known limitation): no compiled field carries a ticket's editable
 * `src/` seed content today, so `seedFiles` below is always `[]` and a fresh ticket's `src` group
 * renders honestly empty rather than fabricated. Everything downstream (autosave, the runner, Layer
 * B, the tree) is wired end to end and will light up unchanged the moment that field exists.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Info, Lock, Play } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { CodeMirrorEditor, CodeMirrorErrorBoundary } from "@/components/editor"
import { CodeConsole, type TestResult, type TestSummary } from "@/components/interview/CodeConsole"
import { AiPolicyBanner } from "@/components/sprint-labs/ui/AiPolicyBanner"
import { ObjectiveList } from "@/components/sprint-labs/ui/ObjectiveList"
import { toNotStartedObjectiveView } from "@/components/sprint-labs/ui/ObjectiveChip"
import { useSprintLabRunSync } from "@/components/sprint-labs/useSprintLabRunSync"
import {
  moveSprintLabRunTicket,
  type SprintLabRunRecord,
  type WorkspaceFileLike,
} from "@/lib/sprint-labs/runs-client"
import { layerB } from "@/lib/sprint-labs/partner/context-layers"
import { computeLayerBInput } from "@/lib/sprint-labs/workspace/layer-b"
import { computeDiffStat } from "@/lib/sprint-labs/workspace/diff-stat"
import { buildWorkspaceTree, defaultActiveFile } from "@/lib/sprint-labs/workspace/tree"
import type { CompiledTicket } from "@/lib/sprint-labs/content/types"
import { WorkspaceFileTabs } from "./WorkspaceFileTabs"
import { TurnStateStrip } from "./TurnStateStrip"
import { useWorkspaceVisibleTests } from "./useWorkspaceVisibleTests"
import { PartnerChat } from "./PartnerChat"
import { AgentKnowledgePanel } from "./AgentKnowledgePanel"
import { fetchPartnerTranscript, setDirectiveMuted } from "@/lib/sprint-labs/partner/chat-client"

/** UX-SPEC.md §1.6, verbatim, reused on three screens (catalog, workspace, submit). No shared
 *  export exists for it yet (screens 1 and 7 belong to other tasks in this same dispatch wave) — see
 *  task-12-report.md for why a new shared file was judged riskier than a documented local copy. */
const SANDBOX_NOTICE =
  "Server side isolated grading lands next month. Until then Sprint Labs runs TypeScript, JavaScript, Python and SQL in your browser."

const EMPTY_SEED_FILES: Record<string, string> = {}
const EMPTY_SOURCE_SEED: WorkspaceFileLike[] = []

export interface WorkspaceViewProps {
  workbookId: string
  run: SprintLabRunRecord
  ticketKey: string
  compiledTicket: CompiledTicket
  /** "What the agent knows about you" panel state -- CONTROLLED from the page, because the button
   *  that opens it lives in `SprintLabTopBar`'s `rightSlot` (page.tsx's own top bar mount, matching
   *  every other run-surface screen's convention), outside this component's own subtree. */
  knowledgeOpen: boolean
  onKnowledgeOpenChange: (open: boolean) => void
}

function languageForPath(path: string): string {
  if (path.endsWith(".md")) return "markdown"
  if (path.endsWith(".sql")) return "sql"
  if (path.endsWith(".tsx") || path.endsWith(".ts")) return "typescript"
  if (path.endsWith(".jsx") || path.endsWith(".js")) return "javascript"
  return "typescript"
}

export function WorkspaceView({
  workbookId,
  run,
  ticketKey,
  compiledTicket,
  knowledgeOpen,
  onKnowledgeOpenChange,
}: WorkspaceViewProps) {
  const router = useRouter()
  const ticket = compiledTicket.ticket

  // UX-SPEC.md §5 interaction table: "TODO to DOING | Opening the workspace on that ticket." Fires
  // at most once per mount regardless of a React 18 StrictMode dev double-invoke -- `run.board`
  // itself is never updated locally after this call, so a naive effect-only guard would re-fire.
  const movedToDoingRef = useRef(false)
  useEffect(() => {
    if (movedToDoingRef.current) return
    if (run.board[ticketKey] === "todo") {
      movedToDoingRef.current = true
      void moveSprintLabRunTicket({ runId: run.id, ticketKey, to: "doing" })
    }
  }, [run.id, run.board, ticketKey])

  // T6's autosave hook, reused verbatim. Seed is always [] today -- see this file's header and
  // lib/sprint-labs/workspace/tree.ts's for the content-compiler gap this is wired-but-dormant for.
  const sync = useSprintLabRunSync(run.id, EMPTY_SOURCE_SEED)

  const [activePath, setActivePath] = useState<string | undefined>(undefined)

  const diffStat = useMemo(() => computeDiffStat(EMPTY_SEED_FILES, sync.files), [sync.files])

  const layerBInput = useMemo(() => {
    const sourceForLayerB = [
      ...Object.entries(sync.files).map(([path, content]) => ({ path, content })),
      ...compiledTicket.visibleTestFiles,
    ]
    return computeLayerBInput(sourceForLayerB, {
      generatedAt: new Date().toISOString(),
      diffStat: diffStat.summary,
    })
    // compiledTicket.visibleTestFiles is intentionally omitted: it is stable for the lifetime of
    // one ticket (it comes from the compiled, load-once registry entry, never reassigned in place).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync.files, diffStat.summary])

  const mapMd = useMemo(() => layerB(layerBInput), [layerBInput])

  const tree = useMemo(
    () =>
      buildWorkspaceTree({
        ticket: compiledTicket,
        editableFiles: sync.files,
        // Wired-but-dormant: no compiled field carries MERIDIAN.md yet (mirrors Task 14's layerA
        // seam for the identical reason). Passing undefined here is the documented, correct state.
        meridianMd: undefined,
        mapMd,
      }),
    // compiledTicket omitted for the same reason as the memo above: stable for one ticket's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sync.files, mapMd]
  )

  // Opens on MERIDIAN.md (or the generated map, per tree.ts's fallback) exactly once, when the tree
  // first has content -- never re-snapped afterward, or every edit would yank focus back to it.
  useEffect(() => {
    if (activePath === undefined && tree.length > 0) {
      setActivePath(defaultActiveFile(tree))
    }
  }, [activePath, tree])

  const activeFile = tree.find((f) => f.path === activePath)

  const fixedTestFiles = useMemo(
    () => compiledTicket.visibleTestFiles.map((f) => ({ path: f.path, content: f.content })),
    [compiledTicket.visibleTestFiles]
  )
  const testPaths = useMemo(
    () => compiledTicket.visibleTestFiles.map((f) => f.path),
    [compiledTicket.visibleTestFiles]
  )
  const visibleTests = useWorkspaceVisibleTests(sync.files, fixedTestFiles, testPaths)

  // Stable-identity callbacks reading the LATEST values via refs, so PartnerChat's props never
  // change identity across renders while still always posting current state at send-time (it only
  // calls these inside its own send() handler, not on every render).
  const filesRef = useRef(sync.files)
  filesRef.current = sync.files
  const layerBInputRef = useRef(layerBInput)
  layerBInputRef.current = layerBInput
  const perTurnRef = useRef({
    redVisibleTests: visibleTests.redVisibleTests,
    diffStat: diffStat.summary,
  })
  perTurnRef.current = { redVisibleTests: visibleTests.redVisibleTests, diffStat: diffStat.summary }

  const getWorkspaceFiles = useCallback(
    () =>
      Object.entries(filesRef.current)
        .slice(0, 60)
        .map(([path, content]) => ({ path, content: content.slice(0, 100_000) })),
    []
  )
  const getLayerBInput = useCallback(() => layerBInputRef.current, [])
  const getPerTurnState = useCallback(() => perTurnRef.current, [])

  // "What the agent knows about you" (AGENT-CONTEXT.md §7) -- decoupled from PartnerChat's own
  // transcript fetch by design (Task 14's report: "a dumb/controlled component is the more testable
  // and more reusable shape"; the workspace top bar's button, owned by the page, is what wires
  // fetch/mute -- `knowledgeOpen` itself is a controlled prop, see WorkspaceViewProps' doc comment).
  const [mutedDirectiveIds, setMutedDirectiveIds] = useState<string[]>([])
  useEffect(() => {
    if (!knowledgeOpen) return
    let cancelled = false
    fetchPartnerTranscript(run.id, ticketKey).then((state) => {
      if (!cancelled && state) setMutedDirectiveIds(state.mutedDirectiveIds)
    })
    return () => {
      cancelled = true
    }
  }, [knowledgeOpen, run.id, ticketKey])

  const onToggleMute = useCallback(
    (directiveId: string, muted: boolean) => {
      void setDirectiveMuted(run.id, ticketKey, directiveId, muted).then((next) => {
        if (next) setMutedDirectiveIds(next)
      })
    },
    [run.id, ticketKey]
  )

  const fileTabsRef = useRef<HTMLDivElement>(null)
  const onEditorKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        // "Escape from the editor moves focus to the file tabs so the editor is never a keyboard
        // trap" (UX-SPEC.md §14).
        const firstTab = fileTabsRef.current?.querySelector<HTMLButtonElement>('[role="tab"]')
        firstTab?.focus()
        return
      }
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === "Enter") {
        e.preventDefault()
        void visibleTests.run()
        return
      }
      if (meta && e.key === "s") {
        // Cmd/Ctrl+S: suppress the browser's own save dialog. useSprintLabRunSync (T6) has no
        // exposed on-demand flush -- it debounces at 1s and flushes on unmount/tab-hide -- so this
        // satisfies "the browser save dialog never appears over the editor" without inventing a new
        // capability on a reused, owned-by-another-task hook. Flagged in task-12-report.md.
        e.preventDefault()
      }
    },
    [visibleTests]
  )

  const consoleResults: TestResult[] = visibleTests.infraError
    ? [
        {
          description: "Workspace test runner",
          passed: false,
          input: null,
          error: visibleTests.infraError,
        },
      ]
    : visibleTests.results.map((r) => ({
        description: `${r.suite}: ${r.name}`,
        passed: r.passed,
        input: r.suite,
        error: r.error,
        isHidden: r.isHidden,
      }))

  const consoleSummary: TestSummary | undefined = visibleTests.infraError
    ? { total: 1, passed: 0, failed: 1, passRate: 0 }
    : visibleTests.summary
      ? {
          total: visibleTests.summary.total,
          passed: visibleTests.summary.passed,
          failed: visibleTests.summary.failed,
          passRate: visibleTests.summary.passRate,
        }
      : undefined

  const objectiveViews = ticket.objectives.map(toNotStartedObjectiveView)

  const submitHref = `/sprint-labs/${workbookId}/run/submit/${ticketKey}`

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AiPolicyBanner
        policy={ticket.aiPolicy}
        reason={ticket.aiPolicyReason}
        className="m-3 mb-0"
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        {/* Left rail: file tree + ticket summary + submit */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-lg border border-[var(--wb-border)] bg-[var(--wb-sidebar)] p-3">
          <div ref={fileTabsRef}>
            <WorkspaceFileTabs
              files={tree}
              activePath={activePath ?? ""}
              onSelect={setActivePath}
            />
          </div>

          <div className="mt-auto flex flex-col gap-2 border-t border-[var(--wb-border)] pt-3">
            <span className="text-[10px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase">
              Ticket
            </span>
            <span className="font-mono text-xs font-medium text-[var(--wb-text)]">{ticketKey}</span>
            {objectiveViews.length > 0 && (
              <ObjectiveList objectives={objectiveViews} density="chip" headingLevel="none" />
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" size="sm" className="mt-1">
                  Submit
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="workbook-surface bg-[var(--wb-card)] text-[var(--wb-text)]">
                <AlertDialogHeader>
                  <AlertDialogTitle>This finalizes your score for {ticketKey}.</AlertDialogTitle>
                  <AlertDialogDescription className="text-[var(--wb-text-secondary)]">
                    Your score for this ticket is set by this run. Escaped defect names and the
                    reference diff unlock after it. Re-attempts get a different hidden set and are
                    labeled practice.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => router.push(submitHref)}>
                    Submit {ticketKey}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Center: editor + run controls + console */}
        <div className="flex min-h-0 flex-col gap-2">
          {activeFile && (
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--wb-text-secondary)]">
              {!activeFile.editable && <Lock className="h-3 w-3" aria-hidden />}
              <span className="truncate font-mono">{activeFile.path}</span>
            </div>
          )}

          {/* Keydown-bubble capture region for Cmd/Ctrl+Enter, Cmd/Ctrl+S and Escape (UX-SPEC.md
              §14) -- not itself an interactive element (no onClick, never a tab stop): it only
              observes events that bubble up from the focused CodeMirror editor inside it. */}
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--wb-border)]"
            onKeyDown={onEditorKeyDown}
          >
            {activeFile ? (
              <CodeMirrorErrorBoundary>
                <CodeMirrorEditor
                  value={activeFile.content}
                  onChange={
                    activeFile.editable
                      ? (value) => sync.setFileContent(activeFile.path, value)
                      : undefined
                  }
                  language={languageForPath(activeFile.path)}
                  readOnly={!activeFile.editable}
                  height="100%"
                />
              </CodeMirrorErrorBoundary>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[var(--wb-faint)]">
                Select a file to view it.
              </div>
            )}
          </div>

          {activeFile && !activeFile.editable && (
            <p className="text-[11px] text-[var(--wb-text-secondary)]">
              Read only. This file is part of the brief.
            </p>
          )}

          {sync.error && (
            <p className="text-destructive text-xs" role="alert">
              {sync.error}
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void visibleTests.run()}
              disabled={visibleTests.status === "running"}
            >
              <Play className="h-3.5 w-3.5" aria-hidden />
              {visibleTests.status === "running" ? "Running…" : "Run visible tests"}
            </Button>
            {visibleTests.summary && (
              <span className="text-xs text-[var(--wb-text-secondary)]">
                {visibleTests.summary.passed}/{visibleTests.summary.total} passing
              </span>
            )}
          </div>

          <div className="min-h-[160px]">
            <CodeConsole
              testResults={consoleResults.length > 0 ? consoleResults : undefined}
              testSummary={consoleSummary}
              isRunning={visibleTests.status === "running"}
              language="typescript"
            />
          </div>
        </div>

        {/* Right: Sable partner */}
        <div className="flex min-h-0 flex-col gap-2 rounded-lg border border-[var(--wb-border)] bg-[var(--wb-panel)] p-3">
          <PartnerChat
            runId={run.id}
            ticketKey={ticketKey}
            aiPolicy={ticket.aiPolicy}
            aiPolicyReason={ticket.aiPolicyReason}
            getWorkspaceFiles={getWorkspaceFiles}
            getLayerBInput={getLayerBInput}
            getPerTurnState={getPerTurnState}
            className="min-h-0 flex-1"
          />
          <p className="flex items-start gap-1 text-[10px] leading-snug text-[var(--wb-faint)]">
            <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            {SANDBOX_NOTICE}
          </p>
          <TurnStateStrip
            status={visibleTests.status}
            failingCount={visibleTests.failingCount}
            filesChanged={diffStat.filesChanged}
          />
        </div>
      </div>

      <AgentKnowledgePanel
        open={knowledgeOpen}
        onOpenChange={onKnowledgeOpenChange}
        directives={[]}
        mutedDirectiveIds={mutedDirectiveIds}
        onToggleMute={onToggleMute}
      />
    </div>
  )
}
