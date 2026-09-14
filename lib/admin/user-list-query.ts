export const USER_SORT_ORDERS = ["asc", "desc"] as const
export const USER_TIERS = ["all", "free", "pro", "enterprise"] as const
export const USER_PROVIDERS = ["all", "google", "github", "password", "unknown"] as const

export type UserSortOrder = (typeof USER_SORT_ORDERS)[number]
export type UserTierFilter = (typeof USER_TIERS)[number]
export type UserProviderFilter = (typeof USER_PROVIDERS)[number]

export interface AdminUserListItem {
  id: string
  email: string
  full_name: string
  auth_provider: string
  subscription_tier: string
  subscription_status: string
  created_at: string
  updated_at: string
  onboarding_completed: boolean
  stripe_customer_id: string | null
  is_protected: boolean
}

export interface UserListQuery {
  search: string
  tier: UserTierFilter
  provider: UserProviderFilter
  signedUpFrom: Date | null
  signedUpTo: Date | null
  sortOrder: UserSortOrder
}

type QueryParseResult = { ok: true; value: UserListQuery } | { ok: false; error: string }

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function parseDateOnly(raw: string | null, boundary: "start" | "end"): Date | null | undefined {
  if (!raw) return null
  if (!DATE_ONLY_PATTERN.test(raw)) return undefined

  const suffix = boundary === "start" ? "T00:00:00.000Z" : "T23:59:59.999Z"
  const date = new Date(`${raw}${suffix}`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw ? undefined : date
}

function isOneOf<const T extends readonly string[]>(value: string, options: T): value is T[number] {
  return options.includes(value as T[number])
}

export function parseUserListQuery(searchParams: URLSearchParams): QueryParseResult {
  const tier = (searchParams.get("tier") || "all").toLowerCase()
  const provider = (searchParams.get("provider") || "all").toLowerCase()
  const sortOrder = (searchParams.get("sortOrder") || "desc").toLowerCase()
  const signedUpFrom = parseDateOnly(searchParams.get("signedUpFrom"), "start")
  const signedUpTo = parseDateOnly(searchParams.get("signedUpTo"), "end")

  if (!isOneOf(tier, USER_TIERS)) return { ok: false, error: "Invalid tier filter" }
  if (!isOneOf(provider, USER_PROVIDERS)) return { ok: false, error: "Invalid provider filter" }
  if (!isOneOf(sortOrder, USER_SORT_ORDERS)) return { ok: false, error: "Invalid sort order" }
  if (signedUpFrom === undefined || signedUpTo === undefined) {
    return { ok: false, error: "Signup dates must use YYYY-MM-DD" }
  }
  if (signedUpFrom && signedUpTo && signedUpFrom > signedUpTo) {
    return { ok: false, error: "Signup start date must be before the end date" }
  }

  return {
    ok: true,
    value: {
      search: (searchParams.get("search") || "").trim().toLowerCase(),
      tier,
      provider,
      signedUpFrom,
      signedUpTo,
      sortOrder,
    },
  }
}

export function filterAndSortUsers(
  users: AdminUserListItem[],
  query: UserListQuery
): AdminUserListItem[] {
  const fromTime = query.signedUpFrom?.getTime() ?? Number.NEGATIVE_INFINITY
  const toTime = query.signedUpTo?.getTime() ?? Number.POSITIVE_INFINITY
  const direction = query.sortOrder === "asc" ? 1 : -1

  return users
    .filter((user) => {
      if (query.tier !== "all" && user.subscription_tier !== query.tier) return false
      if (query.provider !== "all" && user.auth_provider !== query.provider) return false

      const createdAt = Date.parse(user.created_at)
      if (!Number.isFinite(createdAt) || createdAt < fromTime || createdAt > toTime) return false

      if (!query.search) return true
      return [user.email, user.full_name, user.id, user.auth_provider].some((value) =>
        value.toLowerCase().includes(query.search)
      )
    })
    .sort((left, right) => {
      const dateComparison = left.created_at.localeCompare(right.created_at) * direction
      return dateComparison || left.id.localeCompare(right.id) * direction
    })
}
