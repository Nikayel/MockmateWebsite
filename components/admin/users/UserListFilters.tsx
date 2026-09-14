"use client"

import { RotateCcw, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DateFilter, FilterSelect } from "./FilterFields"
import type { UserProviderFilter, UserSortOrder, UserTierFilter } from "@/lib/admin/user-list-query"

export interface UserListFiltersValue {
  tier: UserTierFilter
  provider: UserProviderFilter
  signedUpFrom: string
  signedUpTo: string
  sortOrder: UserSortOrder
  limit: number
}

interface UserListFiltersProps {
  value: UserListFiltersValue
  onChange: (value: UserListFiltersValue) => void
}

const DEFAULT_FILTERS: UserListFiltersValue = {
  tier: "all",
  provider: "all",
  signedUpFrom: "",
  signedUpTo: "",
  sortOrder: "desc",
  limit: 25,
}

export function UserListFilters({ value, onChange }: UserListFiltersProps) {
  const update = <Key extends keyof UserListFiltersValue>(
    key: Key,
    nextValue: UserListFiltersValue[Key]
  ) => onChange({ ...value, [key]: nextValue })

  const hasFilters =
    value.tier !== "all" ||
    value.provider !== "all" ||
    !!value.signedUpFrom ||
    !!value.signedUpTo ||
    value.sortOrder !== "desc" ||
    value.limit !== DEFAULT_FILTERS.limit

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
          <SlidersHorizontal className="h-4 w-4 text-[#c4703f]" aria-hidden="true" />
          Filter users
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(DEFAULT_FILTERS)}
          disabled={!hasFilters}
          className="min-h-11 text-gray-400 hover:text-white"
        >
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
          Reset
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <FilterSelect
          label="Plan"
          value={value.tier}
          onValueChange={(next) => update("tier", next as UserTierFilter)}
          options={[
            ["all", "All plans"],
            ["free", "Free"],
            ["pro", "Pro"],
            ["enterprise", "Enterprise"],
          ]}
        />
        <FilterSelect
          label="Provider"
          value={value.provider}
          onValueChange={(next) => update("provider", next as UserProviderFilter)}
          options={[
            ["all", "All providers"],
            ["google", "Google"],
            ["github", "GitHub"],
            ["password", "Email/password"],
            ["unknown", "Unknown"],
          ]}
        />
        <DateFilter
          label="Signed up from"
          value={value.signedUpFrom}
          max={value.signedUpTo || undefined}
          onChange={(next) => update("signedUpFrom", next)}
        />
        <DateFilter
          label="Signed up to"
          value={value.signedUpTo}
          min={value.signedUpFrom || undefined}
          onChange={(next) => update("signedUpTo", next)}
        />
        <FilterSelect
          label="Signup order"
          value={value.sortOrder}
          onValueChange={(next) => update("sortOrder", next as UserSortOrder)}
          options={[
            ["desc", "Newest first"],
            ["asc", "Oldest first"],
          ]}
        />
        <FilterSelect
          label="Rows per page"
          value={String(value.limit)}
          onValueChange={(next) => update("limit", Number(next))}
          options={[
            ["25", "25 rows"],
            ["50", "50 rows"],
            ["100", "100 rows"],
          ]}
        />
      </div>
    </div>
  )
}
