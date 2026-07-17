/**
 * Reachability guard for the stdout-oracle bugfix packs.
 *
 * The scenario browser lists from the eager `scenarios` barrel (via `useScenarioFilters`).
 * The 14 packs used to live only in the lazy loader, so every one of them was authored,
 * tested, and execution-verified yet appeared on NO start surface — a user could not open
 * a single pack. This asserts every compiled pack id is present in the eager list the
 * browser renders, and that `getScenarioById` resolves it, so the packs cannot silently
 * fall out of reach again.
 */
import { describe, expect, it } from "vitest"
import { scenarios, getScenarioById } from "@/lib/scenarios"
import { bugfixPackScenarios } from "@/lib/scenarios/real-world/bugfix/packs"

describe("bugfix packs are reachable from the scenario browser", () => {
  it("ships at least the 14 authored packs", () => {
    expect(bugfixPackScenarios.length).toBeGreaterThanOrEqual(14)
  })

  it("every pack id is in the eager scenarios list the browser renders", () => {
    const eagerIds = new Set(scenarios.map((s) => s.id))
    const missing = bugfixPackScenarios.map((p) => p.id).filter((id) => !eagerIds.has(id))
    expect(missing).toEqual([])
  })

  it("every pack resolves by id and carries its pack marker", () => {
    for (const pack of bugfixPackScenarios) {
      const resolved = getScenarioById(pack.id)
      expect(resolved, `pack ${pack.id} must resolve by id`).toBeDefined()
      expect(resolved?.type).toBe("bugfix")
      // The pack marker is what routes execution to the stdout-oracle runner.
      expect(
        (resolved as { pack?: unknown }).pack,
        `pack ${pack.id} must keep its marker`
      ).toBeDefined()
    }
  })
})
