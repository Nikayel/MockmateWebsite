/**
 * @vitest-environment jsdom
 *
 * The pending-wizard store carries a finished wizard walk across a full-page round trip
 * (sign-in, upgrade). These tests pin the contract the resume path leans on: a fresh save
 * loads back intact, and everything else (expired, wrong version, corrupt, misshapen) loads
 * as null AND leaves nothing behind, because a stale walk that resurrects itself would
 * generate a surprise roadmap.
 */
import { beforeEach, describe, expect, it } from "vitest"

import {
  PENDING_WIZARD_TTL_MS,
  clearPendingWizard,
  loadPendingWizard,
  savePendingWizard,
  type PendingWizard,
} from "../pending-wizard"

const STORAGE_KEY = "cs-pending-roadmap-wizard"

const wizard: PendingWizard = {
  companyId: "google",
  interviewDate: new Date("2026-09-20T00:00:00.000Z").toISOString(),
  result: {
    experienceLevel: "intern",
    targetTrack: "swe",
    problemsSolved: 40,
    hoursPerDay: 2,
    patternFamiliarity: [{ pattern: "two-pointers", level: "seen" }],
    mixMode: "full",
    selectedCategories: ["dsa"],
  },
} as PendingWizard

const NOW = 1_756_200_000_000

beforeEach(() => {
  window.sessionStorage.clear()
})

describe("savePendingWizard / loadPendingWizard", () => {
  it("round-trips a finished walk", () => {
    savePendingWizard(wizard, NOW)
    expect(loadPendingWizard(NOW)).toEqual(wizard)
  })

  it("loads null when nothing was saved", () => {
    expect(loadPendingWizard(NOW)).toBeNull()
  })

  it("survives right up to the TTL and dies past it, clearing the entry", () => {
    savePendingWizard(wizard, NOW)
    expect(loadPendingWizard(NOW + PENDING_WIZARD_TTL_MS)).toEqual(wizard)

    savePendingWizard(wizard, NOW)
    expect(loadPendingWizard(NOW + PENDING_WIZARD_TTL_MS + 1)).toBeNull()
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("rejects an envelope from another version and clears it", () => {
    savePendingWizard(wizard, NOW)
    const raw = window.sessionStorage.getItem(STORAGE_KEY)!
    window.sessionStorage.setItem(STORAGE_KEY, raw.replace('"version":1', '"version":2'))

    expect(loadPendingWizard(NOW)).toBeNull()
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("rejects corrupt JSON and clears it", () => {
    window.sessionStorage.setItem(STORAGE_KEY, "{not json")

    expect(loadPendingWizard(NOW)).toBeNull()
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it.each([
    ["companyId missing", { ...wizard, companyId: "" }],
    ["date unparseable", { ...wizard, interviewDate: "not-a-date" }],
    ["result missing", { ...wizard, result: null }],
    ["result fields mistyped", { ...wizard, result: { ...wizard.result, hoursPerDay: "2" } }],
    [
      "patternFamiliarity not an array",
      { ...wizard, result: { ...wizard.result, patternFamiliarity: {} } },
    ],
    // Enum membership, not just string-ness: the zod schema rejects values outside
    // the declared unions, so a hand-edited or version-skewed walk cannot replay a
    // mixMode the API has never heard of.
    ["mixMode outside the enum", { ...wizard, result: { ...wizard.result, mixMode: "yolo" } }],
  ])("rejects a misshapen walk (%s) and clears it", (_name, broken) => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, savedAt: NOW, wizard: broken })
    )

    expect(loadPendingWizard(NOW)).toBeNull()
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("a later save overwrites the earlier one", () => {
    savePendingWizard(wizard, NOW)
    const second = { ...wizard, companyId: "stripe" } as PendingWizard
    savePendingWizard(second, NOW + 1000)

    expect(loadPendingWizard(NOW + 2000)).toEqual(second)
  })
})

describe("clearPendingWizard", () => {
  it("removes the saved walk", () => {
    savePendingWizard(wizard, NOW)
    clearPendingWizard()

    expect(loadPendingWizard(NOW)).toBeNull()
  })
})
