import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { PERMISSIONS, ROLE_PERMISSIONS, type AdminRole, type Permission } from "../rbac"

/**
 * The admin API's authorization table.
 *
 * Two things are pinned here, and the second is the one that matters. Asserting
 * "MANAGE_ADMINS admits only super_admin" against ROLE_PERMISSIONS is close to a
 * tautology. What can actually rot is the link between a route and the
 * permission it claims, so each row is also checked against the route's source:
 * the file must reference the permission named below, and must not still be
 * gated on bare verifyAdminAccess (true for ANY role) or on a hand-rolled
 * `if (!role)` preamble (also true for any role).
 *
 * Routes owned by other work in flight are listed in NOT_MINE with a reason, so
 * the gap is visible rather than silently absent.
 */

const ADMIN_API_DIR = join(process.cwd(), "app", "api", "admin")

const ALL_ROLES: AdminRole[] = ["super_admin", "admin", "analyst", "support"]

interface RouteRule {
  /** Path under app/api/admin, without the trailing /route.ts */
  route: string
  /** Which handler this row describes, for readability in test output. */
  method: string
  permission: Permission
  /** Exactly the roles that may reach it. */
  roles: AdminRole[]
}

const SUPER_ADMIN_ONLY: AdminRole[] = ["super_admin"]
const SETTINGS_MANAGERS: AdminRole[] = ["super_admin", "admin"]
const ANALYTICS_READERS: AdminRole[] = ["super_admin", "admin", "analyst"]
const PEOPLE_HANDLERS: AdminRole[] = ["super_admin", "admin", "support"]

const ROUTE_RULES: RouteRule[] = [
  { route: "admins", method: "GET/POST/DELETE", permission: PERMISSIONS.MANAGE_ADMINS, roles: SUPER_ADMIN_ONLY },
  { route: "analytics", method: "GET", permission: PERMISSIONS.VIEW_ANALYTICS, roles: ANALYTICS_READERS },
  { route: "announcements", method: "GET/POST/PUT/DELETE", permission: PERMISSIONS.MANAGE_SETTINGS, roles: SETTINGS_MANAGERS },
  { route: "audit", method: "GET", permission: PERMISSIONS.MANAGE_SETTINGS, roles: SETTINGS_MANAGERS },
  { route: "audit", method: "POST (CSV export)", permission: PERMISSIONS.MANAGE_ADMINS, roles: SUPER_ADMIN_ONLY },
  { route: "bugfix-quality", method: "GET", permission: PERMISSIONS.VIEW_ANALYTICS, roles: ANALYTICS_READERS },
  { route: "cohorts", method: "GET", permission: PERMISSIONS.VIEW_ANALYTICS, roles: ANALYTICS_READERS },
  { route: "cost-anomalies", method: "GET", permission: PERMISSIONS.VIEW_AI_USAGE, roles: ANALYTICS_READERS },
  { route: "cost-anomalies", method: "POST", permission: PERMISSIONS.MANAGE_BUDGETS, roles: SETTINGS_MANAGERS },
  { route: "email-diagnostics", method: "GET", permission: PERMISSIONS.MANAGE_SETTINGS, roles: SETTINGS_MANAGERS },
  { route: "feature-flags", method: "GET/POST/PUT", permission: PERMISSIONS.MANAGE_SETTINGS, roles: SETTINGS_MANAGERS },
  { route: "feature-flags", method: "DELETE", permission: PERMISSIONS.MANAGE_ADMINS, roles: SUPER_ADMIN_ONLY },
  { route: "feedback", method: "GET", permission: PERMISSIONS.VIEW_USER_DETAILS, roles: PEOPLE_HANDLERS },
  { route: "feedback", method: "PUT/DELETE", permission: PERMISSIONS.MANAGE_SETTINGS, roles: SETTINGS_MANAGERS },
  { route: "health", method: "GET", permission: PERMISSIONS.VIEW_ERRORS, roles: ALL_ROLES },
  { route: "health", method: "POST", permission: PERMISSIONS.MANAGE_SETTINGS, roles: SETTINGS_MANAGERS },
  { route: "learn-research", method: "GET", permission: PERMISSIONS.VIEW_ANALYTICS, roles: ANALYTICS_READERS },
  { route: "learn-research", method: "GET?view=export", permission: PERMISSIONS.EXPORT_DATA, roles: ANALYTICS_READERS },
  { route: "learner-model", method: "GET", permission: PERMISSIONS.VIEW_ANALYTICS, roles: ANALYTICS_READERS },
  { route: "nps", method: "GET", permission: PERMISSIONS.VIEW_ANALYTICS, roles: ANALYTICS_READERS },
  { route: "providers", method: "GET", permission: PERMISSIONS.MANAGE_SETTINGS, roles: SETTINGS_MANAGERS },
  { route: "query-performance", method: "GET", permission: PERMISSIONS.VIEW_ANALYTICS, roles: ANALYTICS_READERS },
  { route: "query-performance", method: "POST", permission: PERMISSIONS.MANAGE_USERS, roles: PEOPLE_HANDLERS },
  { route: "rag-health", method: "GET", permission: PERMISSIONS.VIEW_ANALYTICS, roles: ANALYTICS_READERS },
  { route: "rag-health", method: "POST", permission: PERMISSIONS.MANAGE_SETTINGS, roles: SETTINGS_MANAGERS },
  { route: "rate-limits", method: "GET", permission: PERMISSIONS.VIEW_ANALYTICS, roles: ANALYTICS_READERS },
  { route: "rate-limits", method: "POST", permission: PERMISSIONS.MANAGE_USERS, roles: PEOPLE_HANDLERS },
  { route: "scoring", method: "GET", permission: PERMISSIONS.VIEW_ANALYTICS, roles: ANALYTICS_READERS },
  { route: "sessions", method: "GET", permission: PERMISSIONS.VIEW_ANALYTICS, roles: ANALYTICS_READERS },
  { route: "usage", method: "GET", permission: PERMISSIONS.VIEW_AI_USAGE, roles: ANALYTICS_READERS },
  { route: "usage", method: "POST", permission: PERMISSIONS.MANAGE_BUDGETS, roles: SETTINGS_MANAGERS },
  { route: "user-profile", method: "GET", permission: PERMISSIONS.VIEW_USER_DETAILS, roles: PEOPLE_HANDLERS },
  { route: "users", method: "GET", permission: PERMISSIONS.VIEW_USERS, roles: ALL_ROLES },
  { route: "users", method: "DELETE", permission: PERMISSIONS.MANAGE_USERS, roles: PEOPLE_HANDLERS },
]

/**
 * `me` is deliberately withAdminAuth rather than withPermission: it answers
 * "who am I and what may I do", which every admin needs and which reveals only
 * the caller's own identity. Gating it on a permission would break the shell
 * for exactly the roles it exists to describe.
 */
const INTENTIONALLY_ANY_ADMIN = ["me"]

/** Owned by other work in flight at the time of writing. */
const NOT_MINE = [
  "algorithm-research",
  "funnel",
  "payments",
  "referrals",
  "research",
  "revenue",
]

/** The constant name, e.g. VIEW_ANALYTICS, as it appears in route source. */
function permissionConstantName(permission: Permission): string {
  const entry = Object.entries(PERMISSIONS).find(([, value]) => value === permission)
  if (!entry) throw new Error(`No PERMISSIONS constant for ${permission}`)
  return entry[0]
}

function readRoute(route: string): string {
  return readFileSync(join(ADMIN_API_DIR, route, "route.ts"), "utf8")
}

/**
 * Comments removed before scanning for old auth patterns. Several of these
 * routes explain in a comment what their previous `if (!role)` gate did wrong,
 * and a scanner that cannot tell code from prose would flag the explanation.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
}

describe("admin route permissions", () => {
  describe.each(ROUTE_RULES)("$route $method -> $permission", (rule) => {
    it("admits exactly the expected roles", () => {
      const admitted = ALL_ROLES.filter((role) => ROLE_PERMISSIONS[role].includes(rule.permission))
      expect(admitted.sort()).toEqual([...rule.roles].sort())
    })

    it("keeps super_admin in", () => {
      // A permission super_admin lacks would lock the owner out of their own UI.
      expect(ROLE_PERMISSIONS.super_admin).toContain(rule.permission)
    })

    it("is the permission the route actually asks for", () => {
      const source = readRoute(rule.route)
      expect(source).toContain(`PERMISSIONS.${permissionConstantName(rule.permission)}`)
    })
  })

  it("leaves no route in the table gated on a bare admin check", () => {
    const offenders = [...new Set(ROUTE_RULES.map((rule) => rule.route))].filter((route) => {
      const source = stripComments(readRoute(route))
      // verifyAdminAccess returns true for ANY role, and a `!role` test after a
      // getAdminRole lookup is the hand-rolled equivalent.
      return source.includes("verifyAdminAccess") || /if\s*\(\s*!role\b/.test(source)
    })

    expect(offenders).toEqual([])
  })

  it("covers every admin route except the ones explicitly excluded", () => {
    const covered = new Set([
      ...ROUTE_RULES.map((rule) => rule.route),
      ...INTENTIONALLY_ANY_ADMIN,
      ...NOT_MINE,
    ])

    const onDisk = readdirSync(ADMIN_API_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)

    expect(onDisk.filter((route) => !covered.has(route))).toEqual([])
  })
})

describe("role reach, as a whole", () => {
  it("gives the read-only analyst no permission that mutates", () => {
    const mutating: Permission[] = [
      PERMISSIONS.MANAGE_USERS,
      PERMISSIONS.MANAGE_SETTINGS,
      PERMISSIONS.MANAGE_ADMINS,
      PERMISSIONS.MANAGE_BUDGETS,
    ]
    for (const permission of mutating) {
      expect(ROLE_PERMISSIONS.analyst).not.toContain(permission)
    }
  })

  it("keeps support out of revenue and analytics", () => {
    expect(ROLE_PERMISSIONS.support).not.toContain(PERMISSIONS.VIEW_REVENUE)
    expect(ROLE_PERMISSIONS.support).not.toContain(PERMISSIONS.VIEW_ANALYTICS)
    expect(ROLE_PERMISSIONS.support).not.toContain(PERMISSIONS.EXPORT_DATA)
  })

  it("keeps the analyst out of individual user detail", () => {
    expect(ROLE_PERMISSIONS.analyst).not.toContain(PERMISSIONS.VIEW_USER_DETAILS)
  })

  it("gives super_admin everything", () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(ROLE_PERMISSIONS.super_admin).toContain(permission)
    }
  })
})
