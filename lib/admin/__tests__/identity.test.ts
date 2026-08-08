import { describe, it, expect } from "vitest"
import { isAdminRole, parseAdminIdentity } from "../identity"

/**
 * The admin shell used to treat every non-200 from its auth probe as "not an admin".
 * The replacement distinguishes 401/403/failure, which only works if a 200 body that
 * is not actually an identity is rejected rather than half-rendered.
 */
describe("parseAdminIdentity", () => {
  const validBody = {
    success: true,
    userId: "user-1",
    email: "admin@example.com",
    role: "admin",
    permissions: ["view_analytics", "view_users"],
  }

  it("parses a well formed identity", () => {
    expect(parseAdminIdentity(validBody)).toEqual({
      userId: "user-1",
      email: "admin@example.com",
      role: "admin",
      permissions: ["view_analytics", "view_users"],
    })
  })

  it("accepts an identity without an email", () => {
    expect(parseAdminIdentity({ ...validBody, email: null })?.email).toBeNull()
  })

  it("defaults missing permissions to an empty list rather than throwing", () => {
    expect(parseAdminIdentity({ ...validBody, permissions: undefined })?.permissions).toEqual([])
  })

  it("drops non-string permission entries", () => {
    expect(parseAdminIdentity({ ...validBody, permissions: ["view_users", 7, null] })).toEqual(
      expect.objectContaining({ permissions: ["view_users"] })
    )
  })

  it.each([
    ["null", null],
    ["a string", "ok"],
    ["an error envelope", { success: false, error: "nope" }],
    ["a body with no userId", { role: "admin" }],
    ["a body with an empty userId", { userId: "", role: "admin" }],
    ["a body with an unknown role", { userId: "user-1", role: "wizard" }],
    ["a body with no role", { userId: "user-1" }],
  ])("rejects %s", (_label, body) => {
    expect(parseAdminIdentity(body)).toBeNull()
  })
})

describe("isAdminRole", () => {
  it("accepts every declared role", () => {
    for (const role of ["super_admin", "admin", "analyst", "support"]) {
      expect(isAdminRole(role)).toBe(true)
    }
  })

  it("rejects anything else", () => {
    expect(isAdminRole("owner")).toBe(false)
    expect(isAdminRole(undefined)).toBe(false)
  })
})
