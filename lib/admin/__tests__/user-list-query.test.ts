import { describe, expect, it } from "vitest"
import { filterAndSortUsers, parseUserListQuery, type AdminUserListItem } from "../user-list-query"

function user(overrides: Partial<AdminUserListItem>): AdminUserListItem {
  return {
    id: "user-1",
    email: "one@example.com",
    full_name: "One User",
    auth_provider: "google",
    subscription_tier: "free",
    subscription_status: "none",
    created_at: "2026-09-10T12:00:00.000Z",
    updated_at: "",
    onboarding_completed: false,
    stripe_customer_id: null,
    is_protected: false,
    ...overrides,
  }
}

describe("parseUserListQuery", () => {
  it("parses filters and expands date boundaries to the full UTC day", () => {
    const result = parseUserListQuery(
      new URLSearchParams(
        "search=Example&tier=pro&provider=github&signedUpFrom=2026-09-01&signedUpTo=2026-09-10&sortOrder=asc"
      )
    )

    expect(result).toEqual({
      ok: true,
      value: {
        search: "example",
        tier: "pro",
        provider: "github",
        signedUpFrom: new Date("2026-09-01T00:00:00.000Z"),
        signedUpTo: new Date("2026-09-10T23:59:59.999Z"),
        sortOrder: "asc",
      },
    })
  })

  it("rejects invalid enum values, dates, and reversed ranges", () => {
    expect(parseUserListQuery(new URLSearchParams("tier=vip")).ok).toBe(false)
    expect(parseUserListQuery(new URLSearchParams("provider=twitter")).ok).toBe(false)
    expect(parseUserListQuery(new URLSearchParams("sortOrder=sideways")).ok).toBe(false)
    expect(parseUserListQuery(new URLSearchParams("signedUpFrom=09/01/2026")).ok).toBe(false)
    expect(parseUserListQuery(new URLSearchParams("signedUpFrom=2026-02-31")).ok).toBe(false)
    expect(
      parseUserListQuery(new URLSearchParams("signedUpFrom=2026-09-11&signedUpTo=2026-09-10")).ok
    ).toBe(false)
  })
})

describe("filterAndSortUsers", () => {
  const users = [
    user({ id: "new-pro", email: "new@example.com", subscription_tier: "pro" }),
    user({
      id: "old-github",
      email: "old@example.com",
      auth_provider: "github",
      created_at: "2026-08-01T12:00:00.000Z",
    }),
    user({ id: "same-time-b", email: "beta@example.com" }),
  ]

  it("combines search, tier, provider, and inclusive signup-date filters", () => {
    const parsed = parseUserListQuery(
      new URLSearchParams(
        "search=new@&tier=pro&provider=google&signedUpFrom=2026-09-10&signedUpTo=2026-09-10"
      )
    )
    if (!parsed.ok) throw new Error(parsed.error)

    expect(filterAndSortUsers(users, parsed.value).map((entry) => entry.id)).toEqual(["new-pro"])
  })

  it("sorts oldest first and uses id as a deterministic tie-breaker", () => {
    const parsed = parseUserListQuery(new URLSearchParams("sortOrder=asc"))
    if (!parsed.ok) throw new Error(parsed.error)

    expect(filterAndSortUsers(users, parsed.value).map((entry) => entry.id)).toEqual([
      "old-github",
      "new-pro",
      "same-time-b",
    ])
  })
})
