import { describe, expect, it } from "vitest"

import { createFlagSchema, updateFlagSchema } from "../route"

/**
 * Regression: enabling a flag with no expiry set failed with "expiresAt: Invalid datetime".
 * The admin form sends "" for an empty expiry (page.tsx defaults + a cleared <input type="date">),
 * and the schema accepted only a datetime / date / null / undefined, so the empty string matched no
 * branch. The write handlers already coerce any falsy expiresAt to null, so the schema must accept
 * "" as "no expiry".
 */
describe("feature-flag schema expiresAt", () => {
  const base = { key: "sprint_labs_enabled", name: "Sprint Labs", enabled: true }

  it("accepts an empty string as no-expiry on create (the reported bug)", () => {
    const result = createFlagSchema.safeParse({ ...base, expiresAt: "" })
    expect(result.success).toBe(true)
  })

  it("accepts an empty string as no-expiry on update", () => {
    const result = updateFlagSchema.safeParse({ id: "abc123", expiresAt: "" })
    expect(result.success).toBe(true)
  })

  it("still accepts a real date, a real datetime, null, and an omitted expiry", () => {
    expect(createFlagSchema.safeParse({ ...base, expiresAt: "2026-01-01" }).success).toBe(true)
    expect(
      createFlagSchema.safeParse({ ...base, expiresAt: "2026-01-01T00:00:00.000Z" }).success
    ).toBe(true)
    expect(createFlagSchema.safeParse({ ...base, expiresAt: null }).success).toBe(true)
    expect(createFlagSchema.safeParse({ ...base }).success).toBe(true)
  })

  it("still rejects a non-date garbage string", () => {
    expect(createFlagSchema.safeParse({ ...base, expiresAt: "not-a-date" }).success).toBe(false)
  })
})
