/**
 * STATIC PLACEHOLDER — the "Prove It" (sbx) catalog card.
 *
 * This is deliberately NOT compiled content: `docs/sprint-labs/PLAN.md` Task 2's content compiler
 * never produces a `sbx` entry (see `docs/sprint-labs/LAB-01-sbx.md`, which is a catalog-copy spec,
 * not an authored workbook), so there is no `WorkbookSummary` for it in
 * `lib/sprint-labs/content/registry.ts`. Task 10's brief calls for a locked catalog card anyway, to
 * prove the grid renders a workbook the platform cannot run yet — this is that card's data, and
 * only its data. It is never passed to `generateStaticParams`, so `/sprint-labs/sbx` does not exist
 * as a route; the locked card's only affordance is the in-place "What runs today" dialog.
 *
 * Copy is condensed from `docs/sprint-labs/LAB-01-sbx.md`'s catalog-card section. `estimatedHours`
 * holds a placeholder midpoint only to satisfy `WorkbookSummary`'s numeric type — the real "12 to 16
 * h" range is a string and is passed to `WorkbookCard` via `meterOverride` instead of being derived
 * from this field. Do not read `estimatedHours` off this object for display.
 */

import type { WorkbookSummary } from "@/lib/sprint-labs/types"

export const SBX_CATALOG_PLACEHOLDER: WorkbookSummary = {
  id: "sbx",
  title: "Prove It",
  pitch:
    "A cheat-proof research sandbox. Untrusted strategy code runs sealed from the future, and every run can be re-derived byte for byte.",
  track: "Systems / Backend",
  language: "python",
  level: "Senior / Staff",
  topics: [
    "Process isolation",
    "setrlimit and seatbelt",
    "Subprocess protocols",
    "Canonical serialization",
    "Content addressing",
    "Durability and torn writes",
    "Determinism",
    "Adversarial testing",
  ],
  sprintCount: 7,
  ticketCount: 18,
  estimatedHours: 14,
  requiresServerExecution: true,
  objectives: [
    {
      id: "os-security-boundary",
      label: "OS-level isolation",
      canDo:
        "I can design a security boundary at the OS layer instead of relying on in-process checks that a hostile process can bypass.",
    },
    {
      id: "unrepresentable-bugs",
      label: "Unrepresentable bugs",
      canDo:
        "I can shape an API so a whole class of bug cannot be expressed, rather than trusting a caller to avoid it.",
    },
    {
      id: "canonical-hashing",
      label: "Canonical hashing",
      canDo:
        "I can canonicalize data before hashing it, so the hash means the same thing on every machine that computes it.",
    },
    {
      id: "durable-append-only-log",
      label: "Durable append-only logs",
      canDo:
        "I can make an append-only log survive a kill -9 mid-write without corrupting the entries already committed.",
    },
    {
      id: "hunting-nondeterminism",
      label: "Hunting nondeterminism",
      canDo:
        "I can find and pin every source of nondeterminism in a system, then prove the fix holds under mutation testing.",
    },
    {
      id: "adversarial-self-testing",
      label: "Adversarial self-testing",
      canDo:
        "I can write the attacks that try to break my own work, not just the tests that confirm it behaves.",
    },
  ],
}

/** The literal meter row for the placeholder card: `estimatedHours` can't carry a range. */
export const SBX_METER_OVERRIDE = "7 sprints - 18 tickets - 12 to 16 h - Senior to staff"
