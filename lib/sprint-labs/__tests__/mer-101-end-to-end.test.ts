/**
 * MER-101, played through all four gates + the retro (docs/sprint-labs/AGENT-PROMPT.md §4 /
 * PLAN.md Task 22's acceptance bar: "one end-to-end test that plays MER-101 through all four
 * gates and the retro"). Headless vitest, not a live-browser Playwright spec, because this
 * sandbox has no Firebase env and no running dev server -- e2e/sprint-labs-mer-101.spec.ts is the
 * owner-run live proof of the same journey through a real browser + real Firestore, skipped here
 * for exactly that reason. Every function this file calls is the REAL, unmodified production
 * code; the only substitution is documented in "THE ONE SUBSTITUTION" below.
 *
 * ## What gets exercised, module by module
 *
 *  - `lib/sprint-labs/validate/load-tree.ts` (`loadWorkbookTree`) loads the REAL authored
 *    `workbooks/meridian` tree from disk -- no fixture, no copy.
 *  - `lib/sprint-labs/validate/dynamic/materialize.ts` materializes MER-101's tree through
 *    `setup.diff` (RED) and through `reference.diff` (GREEN) via real `git apply`.
 *  - `lib/sprint-labs/validate/dynamic/ts-replay.ts` + `.../node-harness.ts` (`runTsWorkspace`)
 *    run MER-101's real `tests/visible/create-claim.test.ts` against both trees.
 *  - `lib/sprint-labs/validate/dynamic/red-green.ts` (`runDynamicGateForTicket`) and
 *    `lib/sprint-labs/validate/dynamic/provisioning.ts` (`scanProvisioning`) are the exact
 *    functions `pnpm lab:validate:dynamic` runs per ticket -- called here scoped to MER-101 only,
 *    per this task's brief ("invoke them on MER-101's provisioned bundle").
 *  - `lib/sprint-labs/content/registry.ts` (`getTicket`) and `lib/scenarios/sealed/sprint-labs/
 *    registry.server.ts` (`loadSealedTicket`) are called FOR REAL, unmocked. MER-101 is genuinely
 *    compiled into both registries today (`scripts/compile-workbooks.mjs`'s `isFullTicket` gate
 *    compiles any ticket authoring both `reference.diff` and `rubric.yaml` -- MER-101 does --
 *    into a full public ticket AND a sealed `<KEY>.server.ts`; confirmed on disk at
 *    `lib/sprint-labs/content/meridian/tickets/MER-101.ts` and `lib/scenarios/sealed/sprint-labs/
 *    meridian/MER-101.server.ts`). Nothing about MER-101's own content pipeline is mocked.
 *  - `lib/sprint-labs/runtime/io-case-executor.ts` (`runIoCases`/`toIoCaseOutputs`) is the REAL
 *    client-side io-case executor, run against the GREEN materialized tree.
 *  - `lib/sprint-labs/grading/attempts-service.ts` (`openSprintLabAttempt`,
 *    `completeSprintLabAttempt`, `getFinalizedSprintLabAttempt`) is the REAL server orchestration
 *    -- open, the hidden-gate comparison (`gate-runner.ts`'s `runHiddenGate`, server-side,
 *    `deepEqual` against a sealed `expected` this test never lets the "client" side see), scoring,
 *    finalize-once, and the retro read. It calls the two registry functions above for real, and
 *    `lib/sprint-labs/mastery.ts`'s `recordSprintLabMastery` for real too (also unmocked): that
 *    function's own first line is `if (attempt.aiPolicy === "assisted" || !attempt.finalized)
 *    return`, and MER-101 is an `assisted` ticket, so it deterministically no-ops here without
 *    touching anything beyond that guard -- there is nothing to mock.
 *
 * ## THE ONE SUBSTITUTION -- browser Worker -> Node harness
 *
 * `io-case-executor.ts` calls `runTsInWorker` (`@/lib/workspace-execution/ts-workspace`), which
 * spawns a real browser Worker and does not exist in a headless Node process. `node-harness.ts`'s
 * own file header says exactly why it exists: "so `lab validate`'s red/green gate ... can replay
 * a ticket's tests in CI without a browser... A ticket that fails in the worker must fail here
 * too, and vice versa." This test leans on that same guarantee: `@/lib/workspace-execution/
 * ts-workspace` is mocked so `runTsInWorker` delegates to the real `runTsWorkspace` (Node harness)
 * instead of a Worker, with a one-field rename (`consoleLogs` -> `logs`) to match the shape
 * `io-case-executor.ts` expects back. `io-case-executor.ts` itself is imported completely
 * unmodified. This is the one seam a from-scratch Node run cannot avoid; it is the same seam
 * `ts-replay.ts` already stands on for the CI dynamic-validate path.
 *
 * ## What else is mocked, and why (nothing about MER-101's own content or grading logic)
 *
 * Only three things: Firestore (`@/lib/firebase-admin`, faked with the same path->data-map,
 * `runTransaction`/`tx.create` harness `lib/sprint-labs/__tests__/grading.test.ts` already
 * established -- there is no Firestore emulator in this sandbox, so a real `adminDb` cannot run
 * here at all), `@/lib/logger` (silenced, not asserted on), and `@/lib/usage-tracking`'s
 * `trackUsageEvent` (a real usage-tracking write is out of scope for what this test proves and
 * would need its own live backend). Everything else -- content registry, sealed registry,
 * attempts-service, gate-runner, mastery -- is the real, unmodified module.
 */

import { join } from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

// ============================================================
// THE ONE SUBSTITUTION -- see file header. Must be declared before importing
// io-case-executor.ts, which is what actually consumes this barrel.
// ============================================================
vi.mock("@/lib/workspace-execution/ts-workspace", async () => {
  const { runTsWorkspace } = await import("@/lib/workspace-execution/ts-workspace/node-harness")
  return {
    runTsInWorker: async (input: unknown) => {
      const result = await runTsWorkspace(input as Parameters<typeof runTsWorkspace>[0])
      return {
        success: result.success,
        logs: result.consoleLogs,
        error: result.error ?? undefined,
        transpileTimingsMs: result.transpileTimingsMs,
      }
    },
  }
})

// ============================================================
// Faked Firestore -- mirrors lib/sprint-labs/__tests__/grading.test.ts's own fake verbatim (path
// -> data map, vi.hoisted, runTransaction/tx.create support). Duplicated rather than extracted
// into a shared helper: this task's owned paths are the new e2e/seed-script/README, not a refactor
// of that file's established, already-reviewed harness.
// ============================================================
interface FakeDocRef {
  id: string
  __fakePath: string
  get: () => Promise<{
    exists: boolean
    id: string
    data: () => Record<string, unknown> | undefined
  }>
  set: (data: Record<string, unknown>) => Promise<void>
  update: (data: Record<string, unknown>) => Promise<void>
  collection: (name: string) => FakeCollectionRef
}

interface FakeCollectionRef {
  doc: (id?: string) => FakeDocRef
  get: () => Promise<{ docs: Array<{ id: string; data: () => Record<string, unknown> }> }>
  where: (
    field: string,
    op: "==",
    value: unknown
  ) => { get: () => Promise<{ docs: Array<{ id: string; data: () => Record<string, unknown> }> }> }
}

const h = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>()
  let autoIdCounter = 0

  function directChildren(collectionPath: string) {
    const prefix = `${collectionPath}/`
    return Array.from(store.entries()).filter(
      ([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/")
    )
  }

  function docRef(path: string): FakeDocRef {
    return {
      id: path.split("/").pop() as string,
      __fakePath: path,
      get: async () => {
        const data = store.get(path)
        return {
          exists: data !== undefined,
          id: path.split("/").pop() as string,
          data: () => (data ? { ...data } : undefined),
        }
      },
      set: async (data: Record<string, unknown>) => {
        store.set(path, { ...data })
      },
      update: async (data: Record<string, unknown>) => {
        const existing = store.get(path)
        if (existing === undefined) throw new Error(`fake firestore: update on missing doc ${path}`)
        store.set(path, { ...existing, ...data })
      },
      collection: (name: string) => collectionRef(`${path}/${name}`),
    }
  }

  function collectionRef(collectionPath: string): FakeCollectionRef {
    return {
      doc: (id?: string) => docRef(`${collectionPath}/${id ?? `auto_${++autoIdCounter}`}`),
      get: async () => ({
        docs: directChildren(collectionPath).map(([key, data]) => ({
          id: key.slice(collectionPath.length + 1),
          data: () => ({ ...data }),
        })),
      }),
      where: (field: string, op: "==", value: unknown) => ({
        get: async () => ({
          docs: directChildren(collectionPath)
            .filter(([, data]) => (op === "==" ? data[field] === value : false))
            .map(([key, data]) => ({
              id: key.slice(collectionPath.length + 1),
              data: () => ({ ...data }),
            })),
        }),
      }),
    }
  }

  const adminDbFake = {
    collection: (name: string) => collectionRef(name),
    runTransaction: async <T>(
      callback: (tx: {
        get: (refOrQuery: { get: () => Promise<unknown> }) => Promise<unknown>
        set: (ref: FakeDocRef, data: Record<string, unknown>) => void
        create: (ref: FakeDocRef, data: Record<string, unknown>) => void
        update: (ref: FakeDocRef, data: Record<string, unknown>) => void
      }) => Promise<T>
    ): Promise<T> => {
      const tx = {
        get: (refOrQuery: { get: () => Promise<unknown> }) => refOrQuery.get(),
        set: (ref: FakeDocRef, data: Record<string, unknown>) => {
          store.set(ref.__fakePath, { ...data })
        },
        create: (ref: FakeDocRef, data: Record<string, unknown>) => {
          if (store.has(ref.__fakePath)) {
            throw new Error(`fake firestore: create on existing doc ${ref.__fakePath}`)
          }
          store.set(ref.__fakePath, { ...data })
        },
        update: (ref: FakeDocRef, data: Record<string, unknown>) => {
          const existing = store.get(ref.__fakePath)
          store.set(ref.__fakePath, { ...(existing ?? {}), ...data })
        },
      }
      return callback(tx)
    },
  }

  return {
    adminDbFake,
    store,
    reset: () => {
      store.clear()
      autoIdCounter = 0
    },
  }
})

vi.mock("@/lib/firebase-admin", () => ({ adminDb: h.adminDbFake }))
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const usageMocks = vi.hoisted(() => ({ trackUsageEvent: vi.fn() }))
vi.mock("@/lib/usage-tracking", () => ({ trackUsageEvent: usageMocks.trackUsageEvent }))

// ============================================================
// Real production imports -- everything below is unmocked, real code, including the content and
// sealed registries (MER-101 is genuinely compiled into both -- see file header).
// ============================================================
import { loadWorkbookTree } from "@/lib/sprint-labs/validate"
import {
  cleanupGitWorkspace,
  findTicketLocation,
  materializeThroughReference,
  materializeThroughSetup,
} from "@/lib/sprint-labs/validate/dynamic/materialize"
import { readAllFiles } from "@/lib/sprint-labs/validate/dynamic/git-workspace"
import { runTicketFullSuite } from "@/lib/sprint-labs/validate/dynamic/ts-replay"
import { runDynamicGateForTicket } from "@/lib/sprint-labs/validate/dynamic/red-green"
import { scanProvisioning } from "@/lib/sprint-labs/validate/dynamic/provisioning"
import { runIoCases, toIoCaseOutputs } from "@/lib/sprint-labs/runtime/io-case-executor"
import {
  completeSprintLabAttempt,
  getFinalizedSprintLabAttempt,
  openSprintLabAttempt,
} from "@/lib/sprint-labs/grading/attempts-service"
import { loadSealedTicket } from "@/lib/scenarios/sealed/sprint-labs/registry.server"
import type { SealedTicketContent } from "@/lib/scenarios/sealed/sprint-labs/types"

const MERIDIAN_DIR = join(__dirname, "../../../workbooks/meridian")
const TICKET_KEY = "MER-101"
const WORKBOOK_ID = "meridian"

/** MER-101's real sealed content, via the real (unmocked) `loadSealedTicket` -- fails loudly
 *  rather than silently proceeding with `null` if MER-101 is ever demoted back to a stub. */
async function requireMer101Sealed(): Promise<SealedTicketContent> {
  const sealed = await loadSealedTicket(WORKBOOK_ID, TICKET_KEY)
  if (!sealed) throw new Error(`loadSealedTicket returned null for ${WORKBOOK_ID}:${TICKET_KEY}`)
  return sealed
}

function seedRun(runId: string, userId: string) {
  h.store.set(`sprintLabRuns/${runId}`, {
    userId,
    workbookId: WORKBOOK_ID,
    contentVersion: "v1",
    currentSprint: 1,
    board: {},
    status: "in_progress",
    startedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  })
}

// ============================================================
// Gate 1 (visible) -- red on setup, green on reference. Real git-apply materialization + the real
// Node harness, exactly what pnpm lab:validate:dynamic runs per ticket.
// ============================================================
describe("MER-101 visible gate: red on setup, green on reference", () => {
  it("fails at least one visible test against the setup-only (pre-fix) tree -- CLM-77102's own repro", async () => {
    const workbook = loadWorkbookTree(MERIDIAN_DIR)
    const { ticket } = findTicketLocation(workbook, TICKET_KEY)
    const materialized = materializeThroughSetup(workbook, TICKET_KEY)
    expect(materialized.failure).toBeNull()
    try {
      const run = await runTicketFullSuite(materialized.ws, ticket)
      expect(run.result.error).toBeNull()
      const visible = run.result.results.filter((r) => !r.isHidden)
      expect(visible.length).toBeGreaterThan(0)
      expect(visible.some((r) => !r.passed)).toBe(true)
    } finally {
      cleanupGitWorkspace(materialized.ws)
    }
  })

  it("passes every visible test once reference.diff lands on top", async () => {
    const workbook = loadWorkbookTree(MERIDIAN_DIR)
    const { ticket } = findTicketLocation(workbook, TICKET_KEY)
    const materialized = materializeThroughReference(workbook, TICKET_KEY)
    expect(materialized.failure).toBeNull()
    try {
      const run = await runTicketFullSuite(materialized.ws, ticket)
      const visible = run.result.results.filter((r) => !r.isHidden)
      expect(visible.length).toBeGreaterThan(0)
      expect(visible.every((r) => r.passed)).toBe(true)
    } finally {
      cleanupGitWorkspace(materialized.ws)
    }
  })
})

// ============================================================
// Provisioning: the fresh-workspace git-object scan + the "sprint 1 learner" content grep,
// invoked directly on MER-101's provisioned bundle (this task's own verification-bar bullet), plus
// the full dynamic red/green + regression gate for good measure.
// ============================================================
describe("MER-101 provisioning: zero leaks in the learner's own bundle", () => {
  it("scanProvisionedBundleContent and scanFreshWorkspaceGitObjects both report zero findings for MER-101", () => {
    const workbook = loadWorkbookTree(MERIDIAN_DIR)
    const { contentFindings, gitObjectFindings } = scanProvisioning(workbook, TICKET_KEY)
    expect(contentFindings).toEqual([])
    expect(gitObjectFindings).toEqual([])
  })

  it("the full dynamic gate (red/green + regression replay) reports zero findings for MER-101", async () => {
    const workbook = loadWorkbookTree(MERIDIAN_DIR)
    const { ticket } = findTicketLocation(workbook, TICKET_KEY)
    const findings = await runDynamicGateForTicket(workbook, ticket)
    expect(findings).toEqual([])
  })
})

// ============================================================
// Gates 2-4 + retro: open -> the real io-case executor over the GREEN tree -> server-side
// hidden-gate comparison -> finalize -> retro read. getTicket/loadSealedTicket are called for
// real (MER-101 is genuinely compiled into both registries -- see file header); only Firestore,
// logger, and usage-tracking are mocked.
// ============================================================
describe("MER-101 attempt flow: open -> io-case executor -> complete -> finalize -> retro", () => {
  const USER = "user_mer_101_e2e_test"

  beforeEach(() => {
    h.reset()
    usageMocks.trackUsageEvent.mockReset().mockResolvedValue(true)
  })

  it("MER-101 is compiled into the real sealed registry, entirely as io-cases (no probes) -- confirms which hidden-gate channel this flow exercises", async () => {
    const sealed = await requireMer101Sealed()
    expect(sealed.hiddenCases.length).toBe(4)
    expect(sealed.hiddenCases.every((c) => c.kind === "io-case")).toBe(true)
  })

  it("the reference solution: opens against the REAL content/sealed registries, runs the REAL io-case executor against the GREEN materialized tree, completes with zero escapes, finalizes, and releases the retro data", async () => {
    seedRun("run-happy", USER)

    const opened = await openSprintLabAttempt(USER, { runId: "run-happy", ticketKey: TICKET_KEY })
    expect(opened.aiPolicy).toBe("assisted")
    expect(opened.probes).toEqual([])
    expect(opened.ioCases.length).toBeGreaterThan(0)
    for (const c of opened.ioCases) {
      expect(c).not.toHaveProperty("expected") // the answer key never reaches the "client"
    }

    // Materialize MER-101's GREEN tree and run the REAL client io-case executor against it (see
    // file header for the one Worker->Node-harness substitution).
    const workbook = loadWorkbookTree(MERIDIAN_DIR)
    const green = materializeThroughReference(workbook, TICKET_KEY)
    expect(green.failure).toBeNull()
    let ioCaseOutputs: Record<string, unknown>
    try {
      const files = readAllFiles(green.ws)
      const sealed = await requireMer101Sealed()
      const allIoCases = sealed.hiddenCases.map((c) => ({
        id: c.id,
        input: c.input,
        entryPoint: c.entryPoint,
      }))
      const outcomes = await runIoCases(files, allIoCases)
      // The reference solution must make EVERY authored io-case executable and correct, not just
      // whichever subset this attempt's variant happened to issue.
      for (const outcome of outcomes) {
        expect(outcome.status).toBe("ok")
      }
      ioCaseOutputs = toIoCaseOutputs(outcomes)
    } finally {
      cleanupGitWorkspace(green.ws)
    }

    const outcome = await completeSprintLabAttempt(USER, {
      runId: "run-happy",
      ticketKey: TICKET_KEY,
      attemptId: opened.attemptId,
      ioCaseOutputs,
      probeResults: {},
    })

    expect(outcome.attempt.finalized).toBe(true)
    expect(outcome.attempt.escapedDefects).toEqual([])
    const hiddenGate = outcome.attempt.gateResults.find((g) => g.gate === "hidden")
    expect(hiddenGate?.cases.length).toBeGreaterThan(0)
    expect(hiddenGate?.cases.every((c) => c.passed)).toBe(true)
    // MER-101 authors no adversary/ runner (sprint 1 ships without one by design -- sprint.yaml's
    // own sizingNotes -- and the four-gate flow reports an absent adversary honestly, never a
    // fabricated pass).
    const adversaryGate = outcome.attempt.gateResults.find((g) => g.gate === "adversary")
    expect(adversaryGate?.cases).toEqual([])
    expect(outcome.referenceDiff).toContain("parseClaimInput")

    // Retro: fetching the finalized attempt returns the same released data.
    const retro = await getFinalizedSprintLabAttempt(USER, {
      runId: "run-happy",
      ticketKey: TICKET_KEY,
    })
    expect(retro?.outcome.attempt.finalized).toBe(true)
    expect(retro?.outcome.referenceDiff).toEqual(outcome.referenceDiff)
    expect(retro?.outcome.attempt.escapedDefects).toEqual([])
  })

  it("before any submission, the retro/finalized read returns null -- referenceDiff and scores are unreachable pre-finalization", async () => {
    seedRun("run-empty", USER)
    const retro = await getFinalizedSprintLabAttempt(USER, {
      runId: "run-empty",
      ticketKey: TICKET_KEY,
    })
    expect(retro).toBeNull()
  })

  it("a wrong output for an issued io-case is named as an escaped defect by its real curated humanName", async () => {
    seedRun("run-escape", USER)
    const sealed = await requireMer101Sealed()
    const opened = await openSprintLabAttempt(USER, { runId: "run-escape", ticketKey: TICKET_KEY })
    expect(opened.ioCases.length).toBeGreaterThan(0)

    // Every issued case gets its true expected output EXCEPT the first, which gets a deliberately
    // wrong one -- simulating a learner fix that does not handle that one input shape.
    const [escapee, ...rest] = opened.ioCases
    const ioCaseOutputs: Record<string, unknown> = { [escapee.id]: { ok: true, value: "WRONG" } }
    for (const c of rest) {
      ioCaseOutputs[c.id] = sealed.hiddenCases.find((h2) => h2.id === c.id)?.expected
    }

    const outcome = await completeSprintLabAttempt(USER, {
      runId: "run-escape",
      ticketKey: TICKET_KEY,
      attemptId: opened.attemptId,
      ioCaseOutputs,
      probeResults: {},
    })

    const expectedHumanName = sealed.hiddenCases.find((c) => c.id === escapee.id)?.humanName
    expect(outcome.attempt.escapedDefects).toEqual([expectedHumanName])
    expect(outcome.attempt.finalized).toBe(true) // first-ever submission on this run still finalizes
  })
})
