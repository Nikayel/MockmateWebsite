/**
 * The admin navigation model.
 *
 * Kept out of the layout component so the permission rules are testable without
 * rendering React, and client-safe: the Permission import is type-only, so nothing
 * here drags firebase-admin (which lib/admin/rbac.ts imports at module scope) into
 * the browser bundle.
 *
 * Every destination declares the permission it needs. The sidebar previously showed
 * all 21 links to all four roles, so a `support` account was invited into revenue and
 * a read-only `analyst` into settings, then met a 403 on arrival. Hiding a link the
 * role cannot use is not the security boundary, the API check is, but it is the
 * difference between a dashboard that explains itself and one that lies about what
 * you can do.
 */

import type { Permission } from "./rbac"

export const ADMIN_NAV_SECTIONS = ["Core", "Revenue", "Technical", "Operations"] as const
export type AdminNavSection = (typeof ADMIN_NAV_SECTIONS)[number]

export interface AdminNavEntry {
  name: string
  href: string
  section: AdminNavSection
  badge?: string
  /**
   * Permission required to see this destination.
   *
   * INVARIANT: this must match the permission the page's own API route enforces.
   * A looser value here is worse than no filtering, because the link renders, the
   * admin clicks it, and the page 403s. The first version of this file granted the
   * Audit Log on `view_errors` while `app/api/admin/audit/route.ts` requires
   * MANAGE_SETTINGS, which offered analyst and support a link straight into a
   * refusal.
   *
   * Omitting it means every admin role may see the entry, and it is only correct
   * for a destination whose API is not permission-gated at all.
   */
  permission?: Permission
}

/**
 * Order within a section is the display order.
 *
 * `bugfix-quality` and `learn-research` are listed here for the first time. Both
 * pages have existed on disk with no nav entry and no inbound link anywhere in the
 * tree, so they were reachable only by typing the URL.
 */
export const ADMIN_NAV: readonly AdminNavEntry[] = [
  // The overview renders /api/admin/analytics, which requires VIEW_ANALYTICS, so
  // support cannot open it. That role reaches the admin through Users instead; the
  // shell redirects anyone who lands on a destination their role cannot see.
  { name: "Overview", href: "/admin", section: "Core", permission: "view_analytics" },
  { name: "Users", href: "/admin/users", section: "Core", permission: "view_users" },
  { name: "Sessions", href: "/admin/sessions", section: "Core", permission: "view_analytics" },

  { name: "Revenue", href: "/admin/revenue", section: "Revenue", permission: "view_revenue" },
  { name: "Payments", href: "/admin/payments", section: "Revenue", permission: "view_revenue" },
  {
    name: "Growth",
    href: "/admin/growth",
    section: "Revenue",
    badge: "NPS",
    permission: "view_analytics",
  },
  { name: "Funnel", href: "/admin/funnel", section: "Revenue", permission: "view_analytics" },

  { name: "AI Usage", href: "/admin/ai-usage", section: "Technical", permission: "view_ai_usage" },
  {
    name: "Scoring",
    href: "/admin/scoring",
    section: "Technical",
    badge: "AI",
    permission: "view_analytics",
  },
  {
    name: "Rate Limits",
    href: "/admin/rate-limits",
    section: "Technical",
    permission: "view_analytics",
  },
  {
    name: "Infrastructure",
    href: "/admin/infrastructure",
    section: "Technical",
    // Reads /api/admin/cost-anomalies, which requires VIEW_AI_USAGE. Gated on
    // view_errors this offered support a link into a 403, since that role holds
    // view_errors and not view_ai_usage.
    permission: "view_ai_usage",
  },
  { name: "RAG", href: "/admin/rag", section: "Technical", permission: "view_analytics" },
  { name: "System Health", href: "/admin/health", section: "Technical", permission: "view_errors" },
  // The errors page reads /api/admin/analytics, not an errors-specific route, so its
  // gate is VIEW_ANALYTICS despite the name.
  { name: "Errors", href: "/admin/errors", section: "Technical", permission: "view_analytics" },

  {
    name: "Research",
    href: "/admin/research",
    section: "Operations",
    badge: "A/B",
    permission: "view_analytics",
  },
  {
    name: "Learn Research",
    href: "/admin/learn-research",
    section: "Operations",
    permission: "view_analytics",
  },
  {
    name: "Learn Usage",
    href: "/admin/learn-usage",
    section: "Operations",
    // Matches the base gate of /api/admin/learn-usage. The route's per-user branch
    // additionally requires view_user_details, but the page itself is the platform view.
    permission: "view_analytics",
  },
  {
    name: "Bugfix Quality",
    href: "/admin/bugfix-quality",
    section: "Operations",
    permission: "view_analytics",
  },
  {
    name: "Announcements",
    href: "/admin/announcements",
    section: "Operations",
    permission: "manage_settings",
  },
  {
    name: "Feature Flags",
    href: "/admin/feature-flags",
    section: "Operations",
    permission: "manage_settings",
  },
  {
    name: "Feedback",
    href: "/admin/feedback",
    section: "Operations",
    // The queue exposes who wrote each item, so its route requires VIEW_USER_DETAILS.
    permission: "view_user_details",
  },
  { name: "Audit Log", href: "/admin/audit", section: "Operations", permission: "manage_settings" },
  {
    name: "Settings",
    href: "/admin/settings",
    section: "Operations",
    permission: "manage_settings",
  },
]

/**
 * Entries this admin may actually reach. An entry with no declared permission is
 * always visible.
 */
export function visibleNavEntries(
  entries: readonly AdminNavEntry[],
  permissions: readonly Permission[]
): AdminNavEntry[] {
  return entries.filter((entry) => !entry.permission || permissions.includes(entry.permission))
}

/**
 * Where to send an admin who landed on a destination their role cannot see.
 *
 * Necessary because the overview requires VIEW_ANALYTICS, which `support` does not
 * hold, and the overview is both the default landing page and the target of the
 * sidebar logo. Without this, that role's first click into the admin is a 403.
 *
 * Returns null when the role can see nothing at all, which the caller must treat as
 * a genuine access refusal rather than redirecting in a loop.
 */
export function fallbackNavHref(visible: readonly AdminNavEntry[]): string | null {
  return visible[0]?.href ?? null
}

/**
 * Sections that still have at least one visible entry, in declared order. Without
 * this a role whose every Revenue link is hidden still renders an empty "Revenue"
 * heading with nothing beneath it.
 */
export function visibleNavSections(entries: readonly AdminNavEntry[]): AdminNavSection[] {
  return ADMIN_NAV_SECTIONS.filter((section) => entries.some((entry) => entry.section === section))
}

/** The dashboard root. A leaf page rather than a section, so it matches exactly only. */
export const ADMIN_ROOT_HREF = "/admin"

/**
 * Which entry the current path belongs to.
 *
 * Longest matching href wins, so a destination whose href is a prefix of another's
 * does not steal the highlight. The root is excluded from prefix matching because
 * every admin route begins with it: a plain `startsWith` scan lights up Overview on
 * every page in the dashboard, and on unknown subpaths it would claim a page that is
 * not being shown.
 */
export function activeNavHref(entries: readonly AdminNavEntry[], pathname: string): string | null {
  let best: string | null = null

  for (const entry of entries) {
    const isExact = pathname === entry.href
    const isNested = entry.href !== ADMIN_ROOT_HREF && pathname.startsWith(`${entry.href}/`)

    if ((isExact || isNested) && (best === null || entry.href.length > best.length)) {
      best = entry.href
    }
  }

  return best
}
