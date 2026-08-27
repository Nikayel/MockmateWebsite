/**
 * MER-101, played through all four gates + the retro (docs/sprint-labs/AGENT-PROMPT.md §4 /
 * PLAN.md Task 22's acceptance bar: "one end-to-end test that plays MER-101 through all four
 * gates and the retro"). Headless vitest, not a live-browser Playwright spec, because this
 * sandbox has no Firebase env and no running dev server -- see e2e/sprint-labs-mer-101.spec.ts
 * for the browser counterpart, which is `test.skip`ped for exactly that reason and meant for the
 * owner to run with real env. Every function this file calls is the REAL, unmodified production
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
 *  - `lib/sprint-labs/runtime/io-case-executor.ts` (`runIoCases`/`toIoCaseOutputs`) is the REAL
 *    client-side io-case executor, run against the GREEN materialized tree.
 *  - `lib/sprint-labs/grading/attempts-service.ts` (`openSprintLabAttempt`,
 *    `completeSprintLabAttempt`, `getFinalizedSprintLabAttempt`) is the REAL server orchestration
 *    -- open, the hidden-gate comparison (`gate-runner.ts`'s `runHiddenGate`, server-side,
 *    `deepEqual` against a sealed `expected` this test never lets the "client" side see), scoring,
 *    finalize-once, and the retro read.
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
 * ## Why the content/sealed registries are mocked with REAL-file-derived fixtures, not the
 * compiled `lib/sprint-labs/content`/`lib/scenarios/sealed/sprint-labs` registries
 *
 * `workbooks/meridian` cannot compile as a whole today: `scripts/compile-workbooks.mjs` requires
 * `reference.diff` + `rubric.yaml` on EVERY ticket in the workbook, and only sprint 1 (MER-101
 * through MER-105) currently authors them -- sprints 2-10 are still `ticket.md`-only stubs (see
 * this task's own report for the pasted `pnpm workbooks:compile workbooks/meridian` failure).
 * So `getTicket("meridian", "MER-101")` / `loadSealedTicket("meridian", "MER-101")` return nothing
 * useful via the real generated registries yet. Firestore is mocked exactly like the established
 * pattern in `lib/sprint-labs/__tests__/grading.test.ts` (same fake-store shape, same
 * `runTransaction`/`tx.create` support); the content/sealed registries are mocked the same way
 * that file already does (`vi.mock` returning fixture objects), except the fixture DATA here is
 * read straight off MER-101's real authored files (`ticket.md`, the four `tests/hidden/*.yaml`
 * io-cases, `reference.diff`, `rubric.yaml`) via `gray-matter` -- the same library and the same
 * `matter.engines.yaml.parse` entry point `compile-workbooks.mjs` itself uses -- so this test can
 * never silently drift from what MER-101 actually says.
 */

import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import matter from "gray-matter"

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

// ============================================================
// Content + sealed registry mocks -- fixture DATA sourced from MER-101's real authored files (see
// file header). getTicket/loadSealedTicket are the only two functions attempts-service.ts reads
// from these modules.
// ============================================================
const contentMocks = vi.hoisted(() => ({ getTicket: vi.fn() }))
vi.mock("@/lib/sprint-labs/content/registry", () => ({ getTicket: contentMocks.getTicket }))

const sealedMocks = vi.hoisted(() => ({ loadSealedTicket: vi.fn() }))
vi.mock("@/lib/scenarios/sealed/sprint-labs/registry.server", () => ({
  loadSealedTicket: sealedMocks.loadSealedTicket,
}))

const usageMocks = vi.hoisted(() => ({ trackUsageEvent: vi.fn() }))
vi.mock("@/lib/usage-tracking", () => ({ trackUsageEvent: usageMocks.trackUsageEvent }))

const masteryMocks = vi.hoisted(() => ({ recordSprintLabMastery: vi.fn() }))
vi.mock("@/lib/sprint-labs/mastery", () => ({
  recordSprintLabMastery: masteryMocks.recordSprintLabMastery,
}))

// ============================================================
// Real production imports -- everything below is unmocked, real code.
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
import type { CompiledTicket } from "@/lib/sprint-labs/content/types"
import type {
  SealedHiddenCase,
  SealedTicketContent,
} from "@/lib/scenarios/sealed/sprint-labs/types"

const MERIDIAN_DIR = join(__dirname, "../../../workbooks/meridian")
const MER_101_DIR = join(MERIDIAN_DIR, "sprints/01-contracts/tickets/MER-101")
const TICKET_KEY = "MER-101"

// ============================================================
// Fixture builders -- read MER-101's REAL authored files, never a hand-typed copy.
// ============================================================

function loadMer101TicketFixture(): CompiledTicket {
  const { data } = matter(readFileSync(join(MER_101_DIR, "ticket.md"), "utf8"))
  return {
    ticket: {
      key: TICKET_KEY,
      title: data.title,
      points: data.points,
      labels: data.labels ?? [],
      aiPolicy: data.ai_policy,
      objectives: [],
      bodyMd: "",
      acceptanceCriteria: data.acceptanceCriteria ?? [],
      adversaryPresent: false,
    },
    setupDiff: null,
    visibleTestFiles: [],
    hiddenTests: [],
  }
}

function loadMer101SealedFixture(): SealedTicketContent {
  const hiddenDir = join(MER_101_DIR, "tests/hidden")
  const hiddenCases: SealedHiddenCase[] = readdirSync(hiddenDir)
    .filter((name) => name.endsWith(".yaml"))
    .sort()
    .map((fileName) => {
      const raw = matter.engines.yaml.parse(
        readFileSync(join(hiddenDir, fileName), "utf8")
      ) as Record<string, unknown>
      return {
        id: fileName.replace(/\.yaml$/, ""),
        humanName: raw.humanName as string,
        tags: (raw.tags as string[]) ?? [],
        kind: raw.kind as SealedHiddenCase["kind"],
        input: raw.input,
        expected: raw.expected,
        entryPoint: raw.entryPoint as SealedHiddenCase["entryPoint"],
      }
    })

  const rubricRaw = matter.engines.yaml.parse(
    readFileSync(join(MER_101_DIR, "rubric.yaml"), "utf8")
  ) as SealedTicketContent["rubric"]

  return {
    workbookId: "meridian",
    ticketKey: TICKET_KEY,
    hiddenCases,
    adversaryFiles: [],
    review: null,
    authorBrief: null,
    referenceDiff: readFileSync(join(MER_101_DIR, "reference.diff"), "utf8"),
    rubric: rubricRaw,
  }
}

// MER-101 is authored entirely as io-cases (confirmed: all four tests/hidden/*.yaml files declare
// `kind: io-case`, zero `kind: probe`) -- asserted directly in the first attempt-flow test below.

function seedRun(runId: string, userId: string) {
  h.store.set(`sprintLabRuns/${runId}`, {
    userId,
    workbookId: "meridian",
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
// hidden-gate comparison -> finalize -> retro read.
// ============================================================
describe("MER-101 attempt flow: open -> io-case executor -> complete -> finalize -> retro", () => {
  const USER = "user_mer_101_e2e_test"

  beforeEach(() => {
    h.reset()
    contentMocks.getTicket.mockReset().mockResolvedValue(loadMer101TicketFixture())
    sealedMocks.loadSealedTicket.mockReset().mockResolvedValue(loadMer101SealedFixture())
    usageMocks.trackUsageEvent.mockReset().mockResolvedValue(true)
    masteryMocks.recordSprintLabMastery.mockReset().mockResolvedValue(undefined)
  })

  it("MER-101 is authored entirely as io-cases (no probes) -- confirms which hidden-gate channel this flow exercises", () => {
    const sealed = loadMer101SealedFixture()
    expect(sealed.hiddenCases.length).toBe(4)
    expect(sealed.hiddenCases.every((c) => c.kind === "io-case")).toBe(true)
  })

  it("the reference solution: opens, runs the REAL io-case executor against the GREEN materialized tree, completes with zero escapes, finalizes, and releases the retro data", async () => {
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
      const sealed = loadMer101SealedFixture()
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
    const sealed = loadMer101SealedFixture()
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
