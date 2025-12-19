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
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: false,
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
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 bg-gradient-to-r from-primary/10 to-transparent flex items-center justify-between hover:from-primary/15 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center shadow-sm shrink-0">
            <Building2 className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-sm text-foreground">{company.name} Guide</h3>
            <p className="text-[10px] text-muted-foreground">Interview prep & tips</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border"
          >
            {/* Quick actions */}
            <div className="px-3 py-2 flex justify-end gap-2 border-b border-border/50">
              <button
                onClick={expandAll}
                className="text-[10px] text-primary hover:underline"
              >
                Expand All
              </button>
              <span className="text-muted-foreground text-[10px]">|</span>
              <button
                onClick={collapseAll}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Collapse All
              </button>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
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

          <div className="space-y-1.5">
            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Lightbulb className="h-3 w-3 text-yellow-500" />
              Unique Traits
            </h4>
            <ul className="space-y-0.5">
              {company.interviewStyle.uniqueTraits.slice(0, 3).map((trait, i) => (
                <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                  <CheckCircle className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                  {trait}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px]",
              company.interviewStyle.allowsPseudocode
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}>
              {company.interviewStyle.allowsPseudocode ? 'Pseudocode OK' : 'Working code required'}
            </span>
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px]",
              company.interviewStyle.providesHints
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
            )}>
              {company.interviewStyle.providesHints ? 'Hints given' : 'Few hints'}
            </span>
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
          <div className="mb-2 text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Timeline: {company.interviewProcess.timeline}
          </div>

          <div className="space-y-1.5">
            {company.interviewProcess.rounds.map((round, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2 bg-muted/50 rounded-md"
              >
                <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-semibold text-primary">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-[11px] text-foreground capitalize">
                      {round.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ({round.duration}m)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {round.focusAreas.slice(0, 3).map((area, j) => (
                      <span
                        key={j}
                        className="px-1 py-0.5 bg-background border border-border rounded text-[9px] text-muted-foreground"
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
          title="Prep Tips"
          icon={BookOpen}
          expanded={expandedSections.tips}
          onToggle={() => toggleSection('tips')}
          badge={`${company.interviewProcess.tips.length}`}
        >
          <div className="space-y-1.5">
            {company.interviewProcess.tips.slice(0, 4).map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-1.5 p-1.5 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200/50 dark:border-yellow-800/30 rounded-md"
              >
                <AlertCircle className="h-3 w-3 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-foreground leading-snug">{tip}</p>
              </div>
            ))}
          </div>

          {/* Difficulty distribution */}
          <div className="mt-2 p-2 bg-muted/50 rounded-md">
            <h4 className="text-[10px] font-medium text-muted-foreground mb-1.5">Difficulty Distribution</h4>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 flex rounded-full overflow-hidden h-2">
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
            <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                E: {company.difficultyDistribution.easy}%
              </span>
              <span className="flex items-center gap-0.5">
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                M: {company.difficultyDistribution.medium}%
              </span>
              <span className="flex items-center gap-0.5">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                H: {company.difficultyDistribution.hard}%
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
            <div className="grid grid-cols-3 gap-1.5">
              <CompensationCard
                level="Entry (L3)"
                range={company.compensation.entryLevel}
              />
              <CompensationCard
                level="Mid (L4)"
                range={company.compensation.midLevel}
              />
              <CompensationCard
                level="Senior (L5)"
                range={company.compensation.seniorLevel}
              />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5">
              * TC = Base + Stock + Bonus (levels.fyi)
            </p>
          </CollapsibleSection>
        )}
      </div>
          </motion.div>
        )}
      </AnimatePresence>
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
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-xs text-foreground">{title}</span>
          {badge && (
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full">
              {badge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
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
            <div className="px-3 pb-3">{children}</div>
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
    <div className="p-2 bg-muted/50 rounded-md text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground capitalize">{value}</p>
      <p className="text-[9px] text-muted-foreground">{description}</p>
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
    <div className="p-2.5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800/30 rounded-md">
      <p className="text-[10px] text-muted-foreground">{level}</p>
      <p className="text-sm font-bold text-green-700 dark:text-green-400 mt-0.5">{range}</p>
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
