'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
  Zap,
  Target,
  MessageSquare,
  Code,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  BookOpen,
  Building2,
} from 'lucide-react'
import { CompanyQuestionData } from '@/lib/data/company-questions/types'
import { cn } from '@/lib/utils'

interface CompanyInterviewGuideProps {
  company: CompanyQuestionData
  defaultExpanded?: boolean
}

export function CompanyInterviewGuide({ company, defaultExpanded = false }: CompanyInterviewGuideProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: defaultExpanded,
    process: false,
    style: false,
    tips: false,
    compensation: false,
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const expandAll = () => {
    setExpandedSections({
      overview: true,
      process: true,
      style: true,
      tips: true,
      compensation: true,
    })
  }

  const collapseAll = () => {
    setExpandedSections({
      overview: false,
      process: false,
      style: false,
      tips: false,
      compensation: false,
    })
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-transparent border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{company.name} Interview Guide</h3>
              <p className="text-xs text-muted-foreground">What interviewers look for & how to prepare</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="text-xs text-primary hover:underline"
            >
              Expand All
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              onClick={collapseAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="divide-y divide-border">
        {/* Interview Overview */}
        <CollapsibleSection
          title="Interview Overview"
          icon={Target}
          expanded={expandedSections.overview}
          onToggle={() => toggleSection('overview')}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <StatCard
              label="Pace"
              value={company.interviewStyle.pace}
              description={getPaceDescription(company.interviewStyle.pace)}
            />
            <StatCard
              label="Communication"
              value={`${company.interviewStyle.communicationEmphasis}/10`}
              description="How much talking matters"
            />
            <StatCard
              label="Code Quality"
              value={`${company.interviewStyle.codeQualityEmphasis}/10`}
              description="Clean code importance"
            />
            <StatCard
              label="Optimal Required"
              value={company.interviewStyle.optimalSolutionRequired ? 'Yes' : 'No'}
              description="Must reach optimal?"
            />
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Unique Interview Traits
            </h4>
            <ul className="space-y-1">
              {company.interviewStyle.uniqueTraits.map((trait, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  {trait}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-1 rounded text-xs",
                company.interviewStyle.allowsPseudocode
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              )}>
                {company.interviewStyle.allowsPseudocode ? 'Pseudocode OK' : 'Working code required'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-1 rounded text-xs",
                company.interviewStyle.providesHints
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-700"
              )}>
                {company.interviewStyle.providesHints ? 'Interviewers give hints' : 'Few hints given'}
              </span>
            </div>
          </div>
        </CollapsibleSection>

        {/* Interview Process */}
        <CollapsibleSection
          title="Interview Process"
          icon={Users}
          expanded={expandedSections.process}
          onToggle={() => toggleSection('process')}
          badge={`${company.interviewProcess.totalRounds} rounds`}
        >
          <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Timeline: {company.interviewProcess.timeline}
            </span>
          </div>

          <div className="space-y-3">
            {company.interviewProcess.rounds.map((round, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-primary">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground capitalize">
                      {round.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({round.duration} min)
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{round.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {round.focusAreas.map((area, j) => (
                      <span
                        key={j}
                        className="px-2 py-0.5 bg-background border border-border rounded text-xs text-muted-foreground"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Preparation Tips */}
        <CollapsibleSection
          title="How to Prepare"
          icon={BookOpen}
          expanded={expandedSections.tips}
          onToggle={() => toggleSection('tips')}
          badge={`${company.interviewProcess.tips.length} tips`}
        >
          <div className="space-y-3">
            {company.interviewProcess.tips.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-lg"
              >
                <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{tip}</p>
              </div>
            ))}
          </div>

          {/* Difficulty distribution */}
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium text-foreground mb-3">Question Difficulty Distribution</h4>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex rounded-full overflow-hidden h-4">
                <div
                  className="bg-green-500"
                  style={{ width: `${company.difficultyDistribution.easy}%` }}
                />
                <div
                  className="bg-yellow-500"
                  style={{ width: `${company.difficultyDistribution.medium}%` }}
                />
                <div
                  className="bg-red-500"
                  style={{ width: `${company.difficultyDistribution.hard}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Easy: {company.difficultyDistribution.easy}%
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                Medium: {company.difficultyDistribution.medium}%
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                Hard: {company.difficultyDistribution.hard}%
              </span>
            </div>
          </div>
        </CollapsibleSection>

        {/* Compensation */}
        {company.compensation && (
          <CollapsibleSection
            title="Compensation"
            icon={DollarSign}
            expanded={expandedSections.compensation}
            onToggle={() => toggleSection('compensation')}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CompensationCard
                level="Entry Level (L3/E3)"
                range={company.compensation.entryLevel}
              />
              <CompensationCard
                level="Mid Level (L4/E4)"
                range={company.compensation.midLevel}
              />
              <CompensationCard
                level="Senior (L5/E5)"
                range={company.compensation.seniorLevel}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              * TC = Total Compensation (Base + Stock + Bonus). Based on levels.fyi data.
            </p>
          </CollapsibleSection>
        )}
      </div>
    </div>
  )
}

function CollapsibleSection({
  title,
  icon: Icon,
  expanded,
  onToggle,
  badge,
  children,
}: {
  title: string
  icon: typeof Target
  expanded: boolean
  onToggle: () => void
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-primary" />
          <span className="font-medium text-foreground">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
              {badge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string
  value: string
  description: string
}) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground capitalize">{value}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function CompensationCard({
  level,
  range,
}: {
  level: string
  range: string
}) {
  return (
    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800/30 rounded-lg">
      <p className="text-sm text-muted-foreground">{level}</p>
      <p className="text-lg font-bold text-green-700 dark:text-green-400 mt-1">{range}</p>
    </div>
  )
}

function getPaceDescription(pace: 'fast' | 'moderate' | 'relaxed'): string {
  switch (pace) {
    case 'fast':
      return 'Quick problem solving expected'
    case 'moderate':
      return 'Balanced pace, thorough discussion'
    case 'relaxed':
      return 'Time to think and explain'
  }
}
