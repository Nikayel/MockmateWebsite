import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  ADMIN_NAV,
  ADMIN_NAV_SECTIONS,
  visibleNavEntries,
  visibleNavSections,
  activeNavHref,
  fallbackNavHref,
} from "../navigation"
import { ROLE_PERMISSIONS, PERMISSIONS } from "../rbac"

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

  it("hides the overview from support, whose analytics route would 403", () => {
    // The overview renders /api/admin/analytics (VIEW_ANALYTICS). support does not
    // hold it, so offering the link would send that role straight into a refusal.
    const hrefs = visibleNavEntries(ADMIN_NAV, ROLE_PERMISSIONS.support).map((e) => e.href)
    expect(hrefs).not.toContain("/admin")
    expect(hrefs).toContain("/admin/users")
  })

  it("shows nothing to a role with no permissions", () => {
    expect(visibleNavEntries(ADMIN_NAV, [])).toEqual([])
  })

  it("gives every role at least one reachable destination", () => {
    for (const role of Object.keys(ROLE_PERMISSIONS) as (keyof typeof ROLE_PERMISSIONS)[]) {
      const visible = visibleNavEntries(ADMIN_NAV, ROLE_PERMISSIONS[role])
      expect(fallbackNavHref(visible), `${role} has nowhere to land`).not.toBeNull()
    }
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

/**
 * The invariant that actually bit: a nav entry whose permission is looser than the
 * permission its API enforces renders a link straight into a 403. This reads the
 * route files rather than a copy of their rules, so changing a route's gate without
 * changing the nav fails here.
 */
describe("nav permissions match the routes they open", () => {
  // Several pages are not served by a same-named route: the errors page reads the
  // analytics route, and the overview does too. Mapping is therefore explicit.
  const NAV_HREF_TO_ROUTE: Record<string, string> = {
    "/admin": "analytics",
    "/admin/users": "users",
    "/admin/errors": "analytics",
    "/admin/health": "health",
    "/admin/audit": "audit",
    "/admin/announcements": "announcements",
    "/admin/feature-flags": "feature-flags",
    "/admin/feedback": "feedback",
    "/admin/scoring": "scoring",
    "/admin/rag": "rag-health",
    "/admin/learn-research": "learn-research",
    "/admin/bugfix-quality": "bugfix-quality",
  }

  for (const [href, routeDir] of Object.entries(NAV_HREF_TO_ROUTE)) {
    it(`${href} declares the permission ${routeDir} enforces`, () => {
      const source = readFileSync(
        resolve(__dirname, "../../../app/api/admin", routeDir, "route.ts"),
        "utf8"
      )
      const enforced = source.match(/withPermission\(\s*PERMISSIONS\.([A-Z_]+)/)
      if (!enforced) return // route is not permission-gated; nav may declare anything

      const entry = ADMIN_NAV.find((e) => e.href === href)
      expect(entry, `no nav entry for ${href}`).toBeDefined()
      expect(entry!.permission, `${href} would 403 for a role the nav invites in`).toBe(
        PERMISSIONS[enforced[1] as keyof typeof PERMISSIONS]
      )
    })
  }
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
