import type { Profile } from "@/lib/types"

export interface AccountOverviewUsage {
  used: number
  limit: number
  allowed: boolean
  periodEnd: string
  freeOpensRemaining: number
}

export interface AccountOverview {
  profile: Profile
  usage: AccountOverviewUsage
}

export type AccountOverviewResponse =
  | { status: "ready"; overview: AccountOverview }
  | { status: "missing_profile"; message: string }
  | { status: "unavailable"; message: string }
