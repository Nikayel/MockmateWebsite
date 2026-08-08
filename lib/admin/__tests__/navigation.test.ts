import { describe, it, expect } from "vitest"
import {
  ADMIN_NAV,
  ADMIN_NAV_SECTIONS,
  visibleNavEntries,
  visibleNavSections,
  activeNavHref,
} from "../navigation"
import { ROLE_PERMISSIONS } from "../rbac"

/**
 * The sidebar used to render all 21 destinations for all four roles, so a `support`
 * account was invited into revenue and a read-only `analyst` into settings, each
 * meeting a 403 on arrival. These pin the visibility rules against the real
 * ROLE_PERMISSIONS table rather than a copy of it.
 */

describe("visibleNavEntries", () => {
  it("shows super_admin every destination", () => {
    const visible = visibleNavEntries(ADMIN_NAV, ROLE_PERMISSIONS.super_admin)
    expect(visible).toHaveLength(ADMIN_NAV.length)
  })

  it("hides revenue from support", () => {
    const visible = visibleNavEntries(ADMIN_NAV, ROLE_PERMISSIONS.support)
    const hrefs = visible.map((entry) => entry.href)
    expect(hrefs).not.toContain("/admin/revenue")
    expect(hrefs).not.toContain("/admin/payments")
    expect(hrefs).toContain("/admin/users")
  })

  it("hides settings and announcements from analyst", () => {
    // analyst is read-only, so nothing that mutates platform config belongs in its nav.
    const hrefs = visibleNavEntries(ADMIN_NAV, ROLE_PERMISSIONS.analyst).map((e) => e.href)
    expect(hrefs).not.toContain("/admin/settings")
    expect(hrefs).not.toContain("/admin/announcements")
    expect(hrefs).not.toContain("/admin/feature-flags")
    expect(hrefs).toContain("/admin/revenue")
  })

  it("always shows the overview, which declares no permission", () => {
    for (const role of Object.keys(ROLE_PERMISSIONS) as (keyof typeof ROLE_PERMISSIONS)[]) {
      const hrefs = visibleNavEntries(ADMIN_NAV, ROLE_PERMISSIONS[role]).map((e) => e.href)
      expect(hrefs).toContain("/admin")
    }
  })

  it("shows nothing but the overview to a role with no permissions", () => {
    expect(visibleNavEntries(ADMIN_NAV, []).map((e) => e.href)).toEqual(["/admin"])
  })

  it("includes the two pages that had no nav entry at all", () => {
    // Both existed on disk reachable only by typing the URL.
    const hrefs = visibleNavEntries(ADMIN_NAV, ROLE_PERMISSIONS.admin).map((e) => e.href)
    expect(hrefs).toContain("/admin/learn-research")
    expect(hrefs).toContain("/admin/bugfix-quality")
  })
})

describe("visibleNavSections", () => {
  it("drops a section once all of its entries are hidden", () => {
    const supportEntries = visibleNavEntries(ADMIN_NAV, ROLE_PERMISSIONS.support)
    expect(visibleNavSections(supportEntries)).not.toContain("Revenue")
  })

  it("keeps the declared section order", () => {
    const sections = visibleNavSections(visibleNavEntries(ADMIN_NAV, ROLE_PERMISSIONS.super_admin))
    expect(sections).toEqual([...ADMIN_NAV_SECTIONS])
  })
})

describe("activeNavHref", () => {
  it("does not treat every admin path as the overview", () => {
    // "/admin" is a prefix of every route here, so a plain startsWith scan
    // highlighted Overview on every page.
    expect(activeNavHref(ADMIN_NAV, "/admin/users")).toBe("/admin/users")
  })

  it("matches the overview only on the exact path", () => {
    expect(activeNavHref(ADMIN_NAV, "/admin")).toBe("/admin")
  })

  it("prefers the longest matching href", () => {
    expect(activeNavHref(ADMIN_NAV, "/admin/learn-research")).toBe("/admin/learn-research")
  })

  it("matches a nested path to its parent destination", () => {
    expect(activeNavHref(ADMIN_NAV, "/admin/users/abc123")).toBe("/admin/users")
  })

  it("returns null for a path outside the nav", () => {
    expect(activeNavHref(ADMIN_NAV, "/dashboard")).toBeNull()
  })

  it("does not match a sibling whose href merely shares a prefix", () => {
    // "/admin/research" must not light up on "/admin/research-notes".
    expect(activeNavHref(ADMIN_NAV, "/admin/research-notes")).toBeNull()
  })
})

describe("ADMIN_NAV", () => {
  it("has no duplicate hrefs", () => {
    const hrefs = ADMIN_NAV.map((e) => e.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it("assigns every entry to a declared section", () => {
    for (const entry of ADMIN_NAV) {
      expect(ADMIN_NAV_SECTIONS).toContain(entry.section)
    }
  })
})
