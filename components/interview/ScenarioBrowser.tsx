"use client"

import { useMemo, useState, memo } from "react"
import Link from "next/link"
import { Search, Play, LayoutGrid, List, Target, Bug, Wrench, Cpu, Shield, Zap, Check, X, ChevronDown, Clock, Building2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useInterviewStore, type UsageLimit } from "@/lib/stores"
import {
  scenarios,
  filterScenarios,
  type Scenario,
  type ScenarioType,
  type DifficultyLevel,
  type Company,
} from "@/lib/scenarios"
import { PatternBrowser } from "./PatternBrowser"
import { DSARoadmap } from "./DSARoadmap"

interface ScenarioBrowserProps {
  onStartInterview: (scenario: Scenario) => void
  usageLimit: UsageLimit | null
  completedProblems: string[]
  hasGuestBanner?: boolean
}

type ViewMode = 'roadmap' | 'patterns' | 'list'

// Exercise type quick filters with descriptions
const EXERCISE_TYPES = [
  {
    id: 'dsa',
    label: 'DSA',
    description: 'Algorithms & data structures',
    icon: Cpu,
    color: 'bg-sky-500',
    textColor: 'text-white',
    borderColor: 'border-sky-500',
    lightBg: 'bg-sky-500/10',
    lightText: 'text-sky-400'
  },
  {
    id: 'bugfix',
    label: 'Bug Fix',
    description: 'Debug existing code',
    icon: Bug,
    color: 'bg-emerald-500',
    textColor: 'text-white',
    borderColor: 'border-emerald-500',
    lightBg: 'bg-emerald-500/10',
    lightText: 'text-emerald-400'
  },
  {
    id: 'add-functionality',
    label: 'Add Feature',
    description: 'Extend codebases',
    icon: Wrench,
    color: 'bg-amber-500',
    textColor: 'text-black',
    borderColor: 'border-amber-500',
    lightBg: 'bg-amber-500/10',
    lightText: 'text-amber-400'
  },
  {
    id: 'optimization',
    label: 'Optimize',
    description: 'Improve performance',
    icon: Zap,
    color: 'bg-violet-500',
    textColor: 'text-white',
    borderColor: 'border-violet-500',
    lightBg: 'bg-violet-500/10',
    lightText: 'text-violet-400'
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Fix vulnerabilities',
    icon: Shield,
    color: 'bg-red-500',
    textColor: 'text-white',
    borderColor: 'border-red-500',
    lightBg: 'bg-red-500/10',
    lightText: 'text-red-400'
  },
] as const

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { id: 'medium', label: 'Medium', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { id: 'hard', label: 'Hard', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
] as const

const COMPANIES = [
  'Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Netflix', 'Airbnb', 'Shopify', 'Walmart'
] as const

export const ScenarioBrowser = memo(function ScenarioBrowser({ onStartInterview, usageLimit, completedProblems, hasGuestBanner = false }: ScenarioBrowserProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('roadmap')
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const {
    selectedScenario,
    setSelectedScenario,
    filterType,
    setFilterType,
    filterDifficulty,
    setFilterDifficulty,
    filterCompanies,
    setFilterCompanies,
    searchQuery,
    setSearchQuery,
  } = useInterviewStore()

  // Memoize filtered scenarios
  const filteredScenarios = useMemo(() => {
    return filterScenarios({
      type: filterType.length > 0 ? filterType : undefined,
      difficulty: filterDifficulty.length > 0 ? filterDifficulty : undefined,
      companies: filterCompanies.length > 0 ? filterCompanies : undefined,
      searchQuery: searchQuery || undefined,
    })
  }, [filterType, filterDifficulty, filterCompanies, searchQuery])

  const hasActiveFilters = filterType.length > 0 || filterDifficulty.length > 0 || filterCompanies.length > 0 || searchQuery

  const clearAllFilters = () => {
    setFilterType([])
    setFilterDifficulty([])
    setFilterCompanies([])
    setSearchQuery('')
  }

  const getDifficultyStyle = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case "easy": return "bg-emerald-500/10 text-emerald-400"
      case "medium": return "bg-amber-500/10 text-amber-400"
      case "hard": return "bg-red-500/10 text-red-400"
      default: return "bg-zinc-500/10 text-zinc-400"
    }
  }

  const getTypeConfig = (type: ScenarioType) => {
    const config = EXERCISE_TYPES.find(t => t.id === type)
    return config || EXERCISE_TYPES[0]
  }

  // Dynamic padding: more when guest banner is shown (header 64px + banner ~40px)
  const topPadding = hasGuestBanner ? 'pt-28' : 'pt-20'

  return (
    <section className={`${topPadding} pb-12 bg-zinc-950`}>
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          {/* Compact Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-white">
                Practice Problems
              </h1>
              <p className="text-zinc-400 text-sm mt-1">Choose your challenge. Track your progress.</p>
            </div>

            {/* View Mode Toggle - Pill Style */}
            <div className="inline-flex bg-zinc-900 rounded-full p-1 border border-zinc-800 self-start sm:self-auto">
              <button
                onClick={() => setViewMode('roadmap')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  viewMode === 'roadmap'
                    ? 'bg-white text-zinc-900'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Target className="h-4 w-4" />
                Roadmap
              </button>
              <button
                onClick={() => setViewMode('patterns')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  viewMode === 'patterns'
                    ? 'bg-white text-zinc-900'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Patterns
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-zinc-900'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <List className="h-4 w-4" />
                All
              </button>
            </div>
          </div>

          {/* Roadmap View */}
          {viewMode === 'roadmap' && (
            <DSARoadmap
              onStartInterview={onStartInterview}
              completedProblems={completedProblems}
            />
          )}

          {/* Pattern View */}
          {viewMode === 'patterns' && (
            <PatternBrowser
              onStartInterview={onStartInterview}
              completedProblems={completedProblems}
            />
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <>
              {/* Unified Filter Bar */}
              <div className="mb-6 space-y-4">

                {/* Search + Quick Stats */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search problems..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-colors"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-500">
                    <span>{filteredScenarios.length} problems</span>
                    {hasActiveFilters && (
                      <button
                        onClick={clearAllFilters}
                        className="text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <X className="h-3 w-3" />
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Type Filter - Horizontal Pills */}
                <div className="flex flex-wrap gap-2">
                  {EXERCISE_TYPES.map((type) => {
                    const Icon = type.icon
                    const isActive = filterType.includes(type.id as ScenarioType)
                    const count = scenarios.filter(s => s.type === type.id).length
                    return (
                      <button
                        key={type.id}
                        onClick={() => {
                          if (isActive) {
                            setFilterType(filterType.filter(t => t !== type.id))
                          } else {
                            setFilterType([...filterType, type.id as ScenarioType])
                          }
                        }}
                        className={`
                          flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all
                          ${isActive
                            ? `${type.color} ${type.textColor}`
                            : `${type.lightBg} ${type.lightText} hover:opacity-80`
                          }
                        `}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {type.label}
                        <span className={`text-xs ${isActive ? 'opacity-70' : 'opacity-60'}`}>{count}</span>
                        {isActive && <Check className="h-3 w-3" />}
                      </button>
                    )
                  })}
                </div>

                {/* Difficulty + Company Row */}
                <div className="flex flex-wrap gap-3">
                  {/* Difficulty Pills */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">Difficulty</span>
                    <div className="flex gap-1">
                      {DIFFICULTIES.map((diff) => {
                        const isActive = filterDifficulty.includes(diff.id as DifficultyLevel)
                        return (
                          <button
                            key={diff.id}
                            onClick={() => {
                              if (isActive) {
                                setFilterDifficulty(filterDifficulty.filter(d => d !== diff.id))
                              } else {
                                setFilterDifficulty([...filterDifficulty, diff.id as DifficultyLevel])
                              }
                            }}
                            className={`
                              px-3 py-1 rounded-md text-xs font-medium transition-all border
                              ${isActive
                                ? diff.color + ' border-current'
                                : 'text-zinc-400 border-zinc-700 hover:border-zinc-600 hover:text-zinc-300'
                              }
                            `}
                          >
                            {diff.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Company Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                      className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border
                        ${filterCompanies.length > 0
                          ? 'bg-zinc-800 border-zinc-700 text-white'
                          : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                        }
                      `}
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      {filterCompanies.length > 0 ? `${filterCompanies.length} companies` : 'Companies'}
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showCompanyDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showCompanyDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowCompanyDropdown(false)}
                        />
                        <div className="absolute top-full left-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-20 py-2">
                          {COMPANIES.map((company) => {
                            const isActive = filterCompanies.includes(company as Company)
                            return (
                              <button
                                key={company}
                                onClick={() => {
                                  if (isActive) {
                                    setFilterCompanies(filterCompanies.filter(c => c !== company))
                                  } else {
                                    setFilterCompanies([...filterCompanies, company as Company])
                                  }
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-zinc-800 transition-colors"
                              >
                                <span className={isActive ? 'text-white' : 'text-zinc-400'}>{company}</span>
                                {isActive && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                              </button>
                            )
                          })}
                          {filterCompanies.length > 0 && (
                            <>
                              <div className="border-t border-zinc-800 my-1" />
                              <button
                                onClick={() => setFilterCompanies([])}
                                className="w-full px-3 py-2 text-sm text-left text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                              >
                                Clear selection
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Active Filters Summary */}
                {hasActiveFilters && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/50">
                    <span className="text-xs text-zinc-600">Active:</span>
                    {filterType.map(t => {
                      const type = EXERCISE_TYPES.find(et => et.id === t)
                      if (!type) return null
                      const Icon = type.icon
                      return (
                        <span
                          key={t}
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs ${type.lightBg} ${type.lightText}`}
                        >
                          <Icon className="h-3 w-3" />
                          {type.label}
                          <button onClick={() => setFilterType(filterType.filter(ft => ft !== t))} className="hover:opacity-70">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )
                    })}
                    {filterDifficulty.map(d => (
                      <span
                        key={d}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                          d === 'easy' ? 'bg-emerald-500/10 text-emerald-400' :
                          d === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {d}
                        <button onClick={() => setFilterDifficulty(filterDifficulty.filter(fd => fd !== d))} className="hover:opacity-70">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {filterCompanies.map(c => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-300"
                      >
                        {c}
                        <button onClick={() => setFilterCompanies(filterCompanies.filter(fc => fc !== c))} className="hover:opacity-70">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {searchQuery && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-300">
                        "{searchQuery}"
                        <button onClick={() => setSearchQuery('')} className="hover:opacity-70">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Scenarios Grid */}
              {filteredScenarios.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6 text-zinc-600" />
                  </div>
                  <p className="text-zinc-400 mb-2">No problems match your filters</p>
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredScenarios.map((scenario) => {
                    const typeConfig = getTypeConfig(scenario.type)
                    const isSelected = selectedScenario?.id === scenario.id
                    const isCompleted = completedProblems.includes(scenario.id)

                    return (
                      <div
                        key={scenario.id}
                        onClick={() => setSelectedScenario(scenario)}
                        className={`
                          relative bg-zinc-900/50 border rounded-xl p-5 cursor-pointer transition-all
                          ${isSelected
                            ? 'border-white/30 ring-1 ring-white/20'
                            : 'border-zinc-800 hover:border-zinc-700'
                          }
                        `}
                      >
                        {/* Completed badge */}
                        {isCompleted && (
                          <div className="absolute top-3 right-3">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                              <Check className="w-3 h-3 text-emerald-500" />
                            </div>
                          </div>
                        )}

                        {/* Header */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${typeConfig.lightBg} ${typeConfig.lightText}`}>
                            <typeConfig.icon className="h-3 w-3" />
                            {typeConfig.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyStyle(scenario.difficulty)}`}>
                            {scenario.difficulty}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-white font-medium mb-2 line-clamp-1">{scenario.title}</h3>
                        <p className="text-zinc-500 text-sm line-clamp-2 mb-4">{scenario.description}</p>

                        {/* Meta */}
                        <div className="flex items-center justify-between text-xs text-zinc-500 mb-4">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {scenario.estimatedTime} min
                          </div>
                          <div className="flex items-center gap-1 truncate max-w-[120px]">
                            {scenario.companies.slice(0, 2).join(', ')}
                            {scenario.companies.length > 2 && ` +${scenario.companies.length - 2}`}
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {scenario.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-400">
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                          {usageLimit && !usageLimit.allowed && scenario.type !== "dsa" && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-2">
                              <p className="text-amber-400 text-xs font-medium mb-1">Limit reached</p>
                              <p className="text-zinc-400 text-xs mb-2">Upgrade to Pro for unlimited access</p>
                              <Link href="/limit-reached">
                                <Button size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-black text-xs h-7">
                                  Upgrade
                                </Button>
                              </Link>
                            </div>
                          )}

                          {isSelected ? (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                onStartInterview(scenario)
                              }}
                              disabled={!!(usageLimit && usageLimit.allowed === false && scenario.type !== "dsa")}
                              className="w-full bg-white hover:bg-zinc-200 text-zinc-900 font-medium disabled:opacity-50"
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Start Practice
                            </Button>
                          ) : (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedScenario(scenario)
                              }}
                              variant="outline"
                              className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                            >
                              Select
                            </Button>
                          )}

                          {usageLimit && usageLimit.allowed && scenario.type !== "dsa" && (
                            <p className="text-[10px] text-zinc-500 text-center">
                              {usageLimit.limit - usageLimit.used} session{usageLimit.limit - usageLimit.used !== 1 ? 's' : ''} remaining
                            </p>
                          )}
                          {scenario.type === "dsa" && (
                            <p className="text-[10px] text-emerald-500 text-center">Free</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
})
