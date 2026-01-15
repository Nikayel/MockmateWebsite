"use client"

import { useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Search, Building2, ChevronRight, Clock, Users } from "lucide-react"
import { ALL_COMPANIES, COMPANY_TIERS } from "@/lib/data/company-questions"
import { CompanyId, CompanyQuestionData } from "@/lib/data/company-questions/types"
import { cn } from "@/lib/utils"

interface CompanySelectorProps {
  onSelect: (companyId: CompanyId) => void
  selectedCompany?: CompanyId | null
}

export function CompanySelector({ onSelect, selectedCompany }: CompanySelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTier, setSelectedTier] = useState<keyof typeof COMPANY_TIERS | "all">("all")

  const filteredCompanies = ALL_COMPANIES.filter((company) => {
    const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTier =
      selectedTier === "all" || COMPANY_TIERS[selectedTier].companies.includes(company.id)
    return matchesSearch && matchesTier
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-foreground text-2xl font-bold">Choose Your Target Company</h2>
        <p className="text-muted-foreground mt-2">
          We'll create a personalized study plan based on their interview patterns
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <label htmlFor="company-search" className="sr-only">
          Search companies
        </label>
        <Search
          className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          id="company-search"
          type="text"
          placeholder="Search companies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          maxLength={50}
          className="border-border bg-background focus:ring-primary w-full rounded-lg border py-3 pr-4 pl-10 focus:ring-2 focus:outline-none"
          aria-describedby="company-search-help"
        />
        <span id="company-search-help" className="sr-only">
          Type to filter the list of companies below
        </span>
      </div>

      {/* Tier filters */}
      <div className="flex flex-wrap gap-2">
        <TierButton active={selectedTier === "all"} onClick={() => setSelectedTier("all")}>
          All Companies
        </TierButton>
        {Object.entries(COMPANY_TIERS).map(([key, tier]) => (
          <TierButton
            key={key}
            active={selectedTier === key}
            onClick={() => setSelectedTier(key as keyof typeof COMPANY_TIERS)}
          >
            {tier.name}
          </TierButton>
        ))}
      </div>

      {/* Company grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCompanies.map((company, index) => (
          <CompanyCard
            key={company.id}
            company={company}
            isSelected={selectedCompany === company.id}
            onClick={() => onSelect(company.id)}
            delay={index * 0.05}
          />
        ))}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="text-muted-foreground py-12 text-center">
          <Building2 className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>No companies found matching your search</p>
        </div>
      )}
    </div>
  )
}

function TierButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      {children}
    </button>
  )
}

function CompanyCard({
  company,
  isSelected,
  onClick,
  delay,
}: {
  company: CompanyQuestionData
  isSelected: boolean
  onClick: () => void
  delay: number
}) {
  const [logoError, setLogoError] = useState(false)

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className={cn(
        "relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-lg",
        isSelected
          ? "border-primary bg-primary/5 shadow-lg"
          : "border-border bg-card hover:border-primary/50"
      )}
    >
      {isSelected && (
        <motion.div layoutId="selected-indicator" className="absolute top-3 right-3">
          <div className="bg-primary flex h-6 w-6 items-center justify-center rounded-full">
            <ChevronRight className="text-primary-foreground h-4 w-4" />
          </div>
        </motion.div>
      )}

      {/* Company header with logo */}
      <div className="mb-2 flex items-center gap-3">
        <div className="bg-background border-border flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border p-1">
          {logoError ? (
            <Building2 className="text-muted-foreground h-6 w-6" />
          ) : (
            <Image
              src={company.logo}
              alt={`${company.name} logo`}
              width={32}
              height={32}
              className="h-full w-full object-contain"
              onError={() => setLogoError(true)}
            />
          )}
        </div>
        <h3 className="text-foreground text-lg font-semibold">{company.name}</h3>
      </div>

      {/* Stats row */}
      <div className="text-muted-foreground mt-3 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          <span>{company.interviewProcess.totalRounds} rounds</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <span>{company.interviewProcess.timeline}</span>
        </div>
      </div>

      {/* Difficulty bar */}
      <div className="mt-3">
        <div className="flex h-2 gap-1">
          <div
            className="rounded-l bg-green-500"
            style={{ width: `${company.difficultyDistribution.easy}%` }}
          />
          <div
            className="bg-yellow-500"
            style={{ width: `${company.difficultyDistribution.medium}%` }}
          />
          <div
            className="rounded-r bg-red-500"
            style={{ width: `${company.difficultyDistribution.hard}%` }}
          />
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          {company.difficultyDistribution.hard}% hard problems
        </p>
      </div>

      {/* Top patterns preview */}
      <div className="mt-3 flex flex-wrap gap-1">
        {company.topPatterns.slice(0, 3).map((p) => (
          <span
            key={p.pattern}
            className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs"
          >
            {formatPatternName(p.pattern)}
          </span>
        ))}
      </div>
    </motion.button>
  )
}

function formatPatternName(pattern: string): string {
  return pattern
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
