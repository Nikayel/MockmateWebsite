'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Building2, ChevronRight, Star, Clock, Users } from 'lucide-react'
import { ALL_COMPANIES, COMPANY_TIERS } from '@/lib/data/company-questions'
import { CompanyId, CompanyQuestionData } from '@/lib/data/company-questions/types'
import { cn } from '@/lib/utils'

interface CompanySelectorProps {
  onSelect: (companyId: CompanyId) => void
  selectedCompany?: CompanyId | null
}

export function CompanySelector({ onSelect, selectedCompany }: CompanySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTier, setSelectedTier] = useState<keyof typeof COMPANY_TIERS | 'all'>('all')

  const filteredCompanies = ALL_COMPANIES.filter((company) => {
    const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTier = selectedTier === 'all' || COMPANY_TIERS[selectedTier].companies.includes(company.id)
    return matchesSearch && matchesTier
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Choose Your Target Company</h2>
        <p className="mt-2 text-muted-foreground">
          We'll create a personalized study plan based on their interview patterns
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search companies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Tier filters */}
      <div className="flex flex-wrap gap-2">
        <TierButton
          active={selectedTier === 'all'}
          onClick={() => setSelectedTier('all')}
        >
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
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
        'px-4 py-2 rounded-full text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
  const difficultyColor = getDifficultyColor(company.difficultyDistribution.hard)

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className={cn(
        'relative p-4 rounded-xl border-2 text-left transition-all hover:shadow-lg',
        isSelected
          ? 'border-primary bg-primary/5 shadow-lg'
          : 'border-border bg-card hover:border-primary/50'
      )}
    >
      {isSelected && (
        <motion.div
          layoutId="selected-indicator"
          className="absolute top-3 right-3"
        >
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <ChevronRight className="h-4 w-4 text-primary-foreground" />
          </div>
        </motion.div>
      )}

      {/* Company name */}
      <h3 className="font-semibold text-lg text-foreground">{company.name}</h3>

      {/* Stats row */}
      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
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
        <div className="flex gap-1 h-2">
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
        <p className="mt-1 text-xs text-muted-foreground">
          {company.difficultyDistribution.hard}% hard problems
        </p>
      </div>

      {/* Top patterns preview */}
      <div className="mt-3 flex flex-wrap gap-1">
        {company.topPatterns.slice(0, 3).map((p) => (
          <span
            key={p.pattern}
            className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
          >
            {formatPatternName(p.pattern)}
          </span>
        ))}
      </div>
    </motion.button>
  )
}

function getDifficultyColor(hardPercentage: number): string {
  if (hardPercentage >= 40) return 'text-red-500'
  if (hardPercentage >= 25) return 'text-yellow-500'
  return 'text-green-500'
}

function formatPatternName(pattern: string): string {
  return pattern
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
