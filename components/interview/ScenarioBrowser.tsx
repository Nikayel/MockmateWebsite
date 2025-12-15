"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search, Play, LayoutGrid, List, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

interface ScenarioBrowserProps {
  onStartInterview: (scenario: Scenario) => void
  usageLimit: UsageLimit | null
}

type ViewMode = 'list' | 'patterns'

export function ScenarioBrowser({ onStartInterview, usageLimit }: ScenarioBrowserProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('patterns')
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

  const getDifficultyColor = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-600"
      case "medium":
        return "bg-yellow-600"
      case "hard":
        return "bg-red-600"
      default:
        return "bg-gray-600"
    }
  }

  const getTypeColor = (type: ScenarioType) => {
    switch (type) {
      case "dsa":
        return "bg-[#00d9ff] text-black"
      case "bugfix":
        return "bg-[#00ff88] text-black"
      default:
        return "bg-purple-500 text-white"
    }
  }

  return (
    <section className="pt-24 pb-16 bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-4">
              Select Interview Scenario
            </h1>
            <p className="text-xl text-gray-300 mb-6">Choose a problem to practice</p>

            {/* View Mode Toggle */}
            <div className="flex justify-center gap-2 mb-6">
              <Button
                variant={viewMode === 'patterns' ? 'default' : 'outline'}
                onClick={() => setViewMode('patterns')}
                className={viewMode === 'patterns'
                  ? 'bg-[#00d9ff] text-black hover:bg-[#00d9ff]/80'
                  : 'border-gray-600 text-gray-300 hover:bg-gray-800'
                }
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Patterns (NeetCode Style)
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
                className={viewMode === 'list'
                  ? 'bg-[#00d9ff] text-black hover:bg-[#00d9ff]/80'
                  : 'border-gray-600 text-gray-300 hover:bg-gray-800'
                }
              >
                <List className="h-4 w-4 mr-2" />
                All Problems
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="w-2 h-2 rounded-full bg-[#00d9ff]"></div>
                <span className="text-white font-semibold">
                  {scenarios.filter((s) => s.type === "dsa").length}
                </span>
                <span className="text-gray-400">DSA Questions</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="w-2 h-2 rounded-full bg-[#00ff88]"></div>
                <span className="text-white font-semibold">
                  {scenarios.filter((s) => s.type === "bugfix").length}
                </span>
                <span className="text-gray-400">Bug Fix Scenarios</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-white font-semibold">
                  {scenarios.filter((s) => s.type !== "dsa" && s.type !== "bugfix").length}
                </span>
                <span className="text-gray-400">Other</span>
              </div>
            </div>
          </div>

          {/* Pattern View */}
          {viewMode === 'patterns' && (
            <PatternBrowser onStartInterview={onStartInterview} completedProblems={[]} />
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <>

          {/* Filters */}
          <Card className="bg-gray-900/50 border-gray-700 glass-effect mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div className="md:col-span-2 lg:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search scenarios..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>

                {/* Type Filter */}
                <div>
                  <select
                    value={filterType.join(",")}
                    onChange={(e) =>
                      setFilterType(e.target.value ? (e.target.value.split(",") as ScenarioType[]) : [])
                    }
                    className="w-full bg-gray-800 border border-gray-600 text-white rounded-md px-3 py-2"
                  >
                    <option value="">All Types</option>
                    <option value="dsa">DSA</option>
                    <option value="bugfix">Bug Fix</option>
                    <option value="optimization">Optimization</option>
                    <option value="security">Security</option>
                    <option value="system-design">System Design</option>
                  </select>
                </div>

                {/* Difficulty Filter */}
                <div>
                  <select
                    value={filterDifficulty.join(",")}
                    onChange={(e) =>
                      setFilterDifficulty(
                        e.target.value ? (e.target.value.split(",") as DifficultyLevel[]) : []
                      )
                    }
                    className="w-full bg-gray-800 border border-gray-600 text-white rounded-md px-3 py-2"
                  >
                    <option value="">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                {/* Company Filter */}
                <div>
                  <select
                    value={filterCompanies.join(",")}
                    onChange={(e) =>
                      setFilterCompanies(e.target.value ? (e.target.value.split(",") as Company[]) : [])
                    }
                    className="w-full bg-gray-800 border border-gray-600 text-white rounded-md px-3 py-2"
                  >
                    <option value="">All Companies</option>
                    <option value="Google">Google</option>
                    <option value="Meta">Meta</option>
                    <option value="Amazon">Amazon</option>
                    <option value="Microsoft">Microsoft</option>
                    <option value="Apple">Apple</option>
                    <option value="Netflix">Netflix</option>
                    <option value="Airbnb">Airbnb</option>
                    <option value="Shopify">Shopify</option>
                    <option value="Walmart">Walmart</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scenarios List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScenarios.map((scenario) => (
              <Card
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario)}
                className={`bg-gray-900/50 border-gray-700 glass-effect scenario-card cursor-pointer transition-all duration-200 hover:border-gray-600 ${
                  selectedScenario?.id === scenario.id
                    ? "border-[#00d9ff] ring-2 ring-[#00d9ff]/50 selected"
                    : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`${getTypeColor(scenario.type)} text-xs font-semibold`}>
                      {scenario.type === "dsa"
                        ? "DSA"
                        : scenario.type === "bugfix"
                        ? "BUG FIX"
                        : scenario.type.toUpperCase()}
                    </Badge>
                    <Badge className={`${getDifficultyColor(scenario.difficulty)} text-xs`}>
                      {scenario.difficulty.toUpperCase()}
                    </Badge>
                  </div>
                  <CardTitle className="text-white mb-2">{scenario.title}</CardTitle>
                  <p className="text-gray-400 text-sm">{scenario.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {scenario.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                    <span>{scenario.companies.slice(0, 2).join(", ")}</span>
                    <span>{scenario.estimatedTime} min</span>
                  </div>
                  {/* Conditional Button Display */}
                  <div className="space-y-2">
                    {usageLimit && !usageLimit.allowed && scenario.type !== "dsa" && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 mb-2">
                        <p className="text-yellow-400 text-xs font-medium mb-1">Limit Reached</p>
                        <p className="text-gray-300 text-xs mb-2">
                          Upgrade to Pro for unlimited practice!
                        </p>
                        <Link href="/limit-reached">
                          <Button
                            size="sm"
                            className="bg-yellow-500 hover:bg-yellow-600 text-black w-full text-xs h-6"
                          >
                            Upgrade
                          </Button>
                        </Link>
                      </div>
                    )}
                    {selectedScenario?.id === scenario.id ? (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          onStartInterview(scenario)
                        }}
                        disabled={usageLimit && !usageLimit.allowed && scenario.type !== "dsa"}
                        className="w-full bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white disabled:opacity-50 disabled:cursor-not-allowed h-12 text-lg font-semibold shadow-lg"
                      >
                        <Play className="mr-2 h-5 w-5" />
                        Start Interview
                      </Button>
                    ) : (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedScenario(scenario)
                        }}
                        variant="outline"
                        className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                      >
                        Select Practice
                      </Button>
                    )}
                    {usageLimit && usageLimit.allowed && scenario.type !== "dsa" && (
                      <p className="text-xs text-gray-400 text-center">
                        {usageLimit.limit - usageLimit.used} session
                        {usageLimit.limit - usageLimit.used !== 1 ? "s" : ""} remaining
                      </p>
                    )}
                    {scenario.type === "dsa" && (
                      <p className="text-xs text-green-400 text-center">Free to practice</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          </>
          )}
        </div>
      </div>
    </section>
  )
}
