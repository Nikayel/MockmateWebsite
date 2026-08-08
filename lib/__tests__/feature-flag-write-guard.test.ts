/**
 * The guard on the feature-flag write path.
 *
 * `feature_flags` documents are read at runtime by `getFlag()`, so a body that
 * reaches Firestore unchecked is a body that can change production behaviour.
 * Two things have to hold: identity and provenance fields cannot be reassigned,
 * and no field outside the mutable shape survives parsing.
 */

import { describe, expect, it } from "vitest"
import {
  createFlagSchema,
  rejectImmutableFields,
  updateFlagSchema,
} from "@/app/api/admin/feature-flags/route"

describe("mass assignment is refused, not silently dropped", () => {
  it.each(["key", "createdBy", "createdAt", "updatedAt"])(
    "a PUT naming %s is rejected with an error",
    (field) => {
      const message = rejectImmutableFields({ id: "flag-1", enabled: true, [field]: "forged" })
      expect(message).toContain(field)
    }
  )

  it("names every offender at once so a caller does not fix them one at a time", () => {
    const message = rejectImmutableFields({ id: "f", key: "x", createdBy: "someone-else" })
    expect(message).toContain("key")
    expect(message).toContain("createdBy")
  })

  it("allows a body that only names mutable fields", () => {
    expect(rejectImmutableFields({ id: "flag-1", enabled: false, rolloutPercentage: 25 })).toBeNull()
  })
})

describe("updateFlagSchema", () => {
  it("strips any field outside the mutable shape", () => {
    const parsed = updateFlagSchema.parse({
      id: "flag-1",
      enabled: true,
      // The whole point: these must not reach the Firestore update.
      createdBy: "attacker",
      key: "some_other_flag",
      admin: true,
    })
    expect(parsed).toEqual({ id: "flag-1", enabled: true })
  })

  it("accepts a single-field change, since a toggle sends only `enabled`", () => {
    expect(updateFlagSchema.parse({ id: "flag-1", enabled: false })).toEqual({
      id: "flag-1",
      enabled: false,
    })
  })

  it("requires an id", () => {
    expect(updateFlagSchema.safeParse({ enabled: true }).success).toBe(false)
  })

  it("rejects values the runtime resolver would have to guess at", () => {
    expect(updateFlagSchema.safeParse({ id: "f", enabled: "yes" }).success).toBe(false)
    expect(updateFlagSchema.safeParse({ id: "f", rolloutPercentage: 140 }).success).toBe(false)
    expect(updateFlagSchema.safeParse({ id: "f", rolloutPercentage: -1 }).success).toBe(false)
    expect(updateFlagSchema.safeParse({ id: "f", environment: "prod" }).success).toBe(false)
    expect(updateFlagSchema.safeParse({ id: "f", type: "kill-switch" }).success).toBe(false)
  })
})

describe("createFlagSchema", () => {
  it("pins the key format, because the resolver uppercases it to find the switch", () => {
    expect(createFlagSchema.safeParse({ key: "disable_voice_mode", name: "V" }).success).toBe(true)
    expect(createFlagSchema.safeParse({ key: "Disable Voice", name: "V" }).success).toBe(false)
    expect(createFlagSchema.safeParse({ key: "2fast", name: "V" }).success).toBe(false)
    expect(createFlagSchema.safeParse({ key: "a", name: "V" }).success).toBe(false)
  })

  it("requires a key and a name", () => {
    expect(createFlagSchema.safeParse({ name: "No key" }).success).toBe(false)
    expect(createFlagSchema.safeParse({ key: "some_flag" }).success).toBe(false)
  })

  it("defaults a new flag to off at full rollout, so creating one changes nothing yet", () => {
    const parsed = createFlagSchema.parse({ key: "some_flag", name: "Some Flag" })
    expect(parsed.enabled).toBe(false)
    expect(parsed.rolloutPercentage).toBe(100)
    expect(parsed.environment).toBe("all")
    expect(parsed.targetUserIds).toEqual([])
  })

  it("ignores a caller-supplied createdBy", () => {
    const parsed = createFlagSchema.parse({
      key: "some_flag",
      name: "Some Flag",
      createdBy: "attacker",
    })
    expect(parsed).not.toHaveProperty("createdBy")
  })
})
