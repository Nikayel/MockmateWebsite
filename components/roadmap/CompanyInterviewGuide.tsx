"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  GraduationCap,
  Star,
} from "lucide-react"
import { CompanyQuestionData } from "@/lib/data/company-questions/types"
import { cn } from "@/lib/utils"

interface CompanyInterviewGuideProps {
  company: CompanyQuestionData
  defaultExpanded?: boolean
  isIntern?: boolean
}

// Intern-specific interview tips by company
const internTips: Record<string, string[]> = {
  google: [
    "Focus on fundamentals - interns are evaluated on learning potential, not expert-level solutions",
    "Practice explaining your thought process clearly - communication matters more for interns",
    "Don't worry about system design - focus on coding and problem-solving skills",
    "Google hosts tend to be very helpful and will guide you through the problem",
  ],
  meta: [
    "Meta intern interviews are more focused on coding fundamentals",
    "Expect 2 coding rounds instead of the full-time 3-4 rounds",
    "Practice medium-difficulty problems from their most common patterns",
    "Behavioral questions will focus on teamwork and learning experiences",
  ],
  amazon: [
    "Leadership Principles matter even for interns - prepare 2-3 stories",
    "Focus on customer obsession and learn & be curious principles",
    "Expect bar raiser round to assess cultural fit and growth potential",
    "Practice explaining trade-offs in your solutions",
  ],
  microsoft: [
    "Microsoft is known for being intern-friendly with supportive interviewers",
    "Focus on clean code and good coding practices",
    "Practice debugging and testing scenarios",
    "Show enthusiasm for the specific team/product you're applying to",
  ],
  apple: [
    "Apple values creativity and thinking differently",
    "Expect more open-ended problems with multiple solutions",
    "Team fit is crucial - research the specific team culture",
    "Be prepared to discuss your past projects in detail",
  ],
}

const defaultInternTips = [
  "Focus on fundamentals over advanced topics",
  "Practice explaining your thought process out loud",
  "Show enthusiasm and willingness to learn",
  "Prepare questions about mentorship and learning opportunities",
]

export function CompanyInterviewGuide({
  company,
  defaultExpanded = false,
  isIntern = false,
}: CompanyInterviewGuideProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: false,
    process: false,
    style: false,
    tips: false,
    compensation: false,
    internTips: isIntern, // Auto-expand intern tips if user is an intern
  })

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const expandAll = () => {
    setExpandedSections({
      overview: true,
      process: true,
      style: true,
      tips: true,
      compensation: true,
      internTips: true,
    })
  }

  const collapseAll = () => {
    setExpandedSections({
      overview: false,
      process: false,
      style: false,
      tips: false,
      compensation: false,
      internTips: false,
    })
  }

  // Get intern-specific tips for this company
  const companyInternTips = internTips[company.id] || defaultInternTips

  return (
    <div className="bg-card border-border overflow-hidden rounded-xl border">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="from-primary/10 hover:from-primary/15 flex w-full items-center justify-between bg-gradient-to-r to-transparent p-3 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white shadow-sm">
            <Building2 className="text-primary h-3.5 w-3.5" />
          </div>
          <div className="text-left">
            <h3 className="text-foreground text-sm font-semibold">{company.name} Guide</h3>
            <p className="text-muted-foreground text-[10px]">Interview prep & tips</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="text-muted-foreground h-4 w-4" />
        ) : (
          <ChevronDown className="text-muted-foreground h-4 w-4" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-border overflow-hidden border-t"
          >
            {/* Quick actions */}
            <div className="border-border/50 flex justify-end gap-2 border-b px-3 py-2">
              <button onClick={expandAll} className="text-primary text-[10px] hover:underline">
                Expand All
              </button>
              <span className="text-muted-foreground text-[10px]">|</span>
              <button
                onClick={collapseAll}
                className="text-muted-foreground hover:text-foreground text-[10px]"
              >
                Collapse All
              </button>
            </div>

            {/* Collapsible Sections */}
            <div className="divide-border divide-y">
              {/* Interview Overview */}
              <CollapsibleSection
                title="Interview Overview"
                icon={Target}
                expanded={expandedSections.overview}
                onToggle={() => toggleSection("overview")}
              >
                <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
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
                    value={company.interviewStyle.optimalSolutionRequired ? "Yes" : "No"}
                    description="Must reach optimal?"
                  />
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-muted-foreground flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase">
                    <Lightbulb className="h-3 w-3 text-yellow-500" />
                    Unique Traits
                  </h4>
                  <ul className="space-y-0.5">
                    {company.interviewStyle.uniqueTraits.slice(0, 3).map((trait, i) => (
                      <li
                        key={i}
                        className="text-muted-foreground flex items-start gap-1.5 text-[11px]"
                      >
                        <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                        {trait}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                      company.interviewStyle.allowsPseudocode
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    )}
                  >
                    {company.interviewStyle.allowsPseudocode
                      ? "Pseudocode OK"
                      : "Working code required"}
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                      company.interviewStyle.providesHints
                        ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    )}
                  >
                    {company.interviewStyle.providesHints ? "Hints given" : "Few hints"}
                  </span>
                </div>
              </CollapsibleSection>

              {/* Interview Process */}
              <CollapsibleSection
                title="Interview Process"
                icon={Users}
                expanded={expandedSections.process}
                onToggle={() => toggleSection("process")}
                badge={`${company.interviewProcess.totalRounds} rounds`}
              >
                <div className="text-muted-foreground mb-2 flex items-center gap-1 text-[10px]">
                  <Clock className="h-3 w-3" />
                  Timeline: {company.interviewProcess.timeline}
                </div>

                <div className="space-y-1.5">
                  {company.interviewProcess.rounds.map((round, i) => (
                    <div key={i} className="bg-muted/50 flex items-start gap-2 rounded-md p-2">
                      <div className="bg-primary/10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                        <span className="text-primary text-[10px] font-semibold">{i + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-foreground text-[11px] font-medium capitalize">
                            {round.type.replace("_", " ")}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            ({round.duration}m)
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-0.5">
                          {round.focusAreas.slice(0, 3).map((area, j) => (
                            <span
                              key={j}
                              className="bg-background border-border text-muted-foreground rounded border px-1 py-0.5 text-[9px]"
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
                onToggle={() => toggleSection("tips")}
                badge={`${company.interviewProcess.tips.length}`}
              >
                <div className="space-y-1.5">
                  {company.interviewProcess.tips.slice(0, 4).map((tip, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-1.5 rounded-md border border-yellow-200/50 bg-yellow-50 p-1.5 dark:border-yellow-800/30 dark:bg-yellow-900/10"
                    >
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-yellow-600" />
                      <p className="text-foreground text-[10px] leading-snug">{tip}</p>
                    </div>
                  ))}
                </div>

                {/* Difficulty distribution */}
                <div className="bg-muted/50 mt-2 rounded-md p-2">
                  <h4 className="text-muted-foreground mb-1.5 text-[10px] font-medium">
                    Difficulty Distribution
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-2 flex-1 overflow-hidden rounded-full">
                      <div
                        className="bg-emerald-500"
                        style={{ width: `${company.difficultyDistribution.easy}%` }}
                      />
                      <div
                        className="bg-amber-500"
                        style={{ width: `${company.difficultyDistribution.medium}%` }}
                      />
                      <div
                        className="bg-rose-500"
                        style={{ width: `${company.difficultyDistribution.hard}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-muted-foreground mt-1.5 flex justify-between text-[9px]">
                    <span className="flex items-center gap-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Easy: {company.difficultyDistribution.easy}%
                    </span>
                    <span className="flex items-center gap-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Med: {company.difficultyDistribution.medium}%
                    </span>
                    <span className="flex items-center gap-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
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
                  onToggle={() => toggleSection("compensation")}
                >
                  <div className="grid grid-cols-3 gap-1.5">
                    <CompensationCard level="Entry (L3)" range={company.compensation.entryLevel} />
                    <CompensationCard level="Mid (L4)" range={company.compensation.midLevel} />
                    <CompensationCard
                      level="Senior (L5)"
                      range={company.compensation.seniorLevel}
                    />
                  </div>
                  <p className="text-muted-foreground mt-1.5 text-[9px]">
                    * TC = Base + Stock + Bonus (levels.fyi)
                  </p>
                </CollapsibleSection>
              )}

              {/* Intern-Specific Tips - Only shown for intern users */}
              {isIntern && (
                <CollapsibleSection
                  title="Intern Interview Tips"
                  icon={GraduationCap}
                  expanded={expandedSections.internTips}
                  onToggle={() => toggleSection("internTips")}
                  badge="For You"
                >
                  <div className="space-y-2">
                    {/* Intern-specific badge */}
                    <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-2">
                      <Star className="h-4 w-4 text-blue-500" />
                      <p className="text-foreground text-[11px] font-medium">
                        Tailored tips for {company.name} internship interviews
                      </p>
                    </div>

                    {/* Tips list */}
                    <div className="space-y-1.5">
                      {companyInternTips.map((tip, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-1.5 rounded-md border border-blue-200/50 bg-blue-50 p-2 dark:border-blue-800/30 dark:bg-blue-900/10"
                        >
                          <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                          <p className="text-foreground text-[11px] leading-snug">{tip}</p>
                        </div>
                      ))}
                    </div>

                    {/* Intern interview structure */}
                    <div className="bg-muted/50 mt-3 rounded-md p-2">
                      <h4 className="text-muted-foreground mb-1.5 flex items-center gap-1 text-[10px] font-medium">
                        <Users className="h-3 w-3" />
                        Typical Intern Interview Structure
                      </h4>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="bg-primary/10 text-primary flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold">
                            1
                          </span>
                          <span className="text-muted-foreground">
                            Recruiter Screen (15-30 min)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="bg-primary/10 text-primary flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold">
                            2
                          </span>
                          <span className="text-muted-foreground">
                            Coding Interview(s) (45-60 min each)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="bg-primary/10 text-primary flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold">
                            3
                          </span>
                          <span className="text-muted-foreground">
                            Behavioral/Team Fit (30-45 min)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
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
        className="hover:bg-muted/50 flex w-full items-center justify-between px-3 py-2.5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="text-primary h-3.5 w-3.5" />
          <span className="text-foreground text-xs font-medium">{title}</span>
          {badge && (
            <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-[10px]">
              {badge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="text-muted-foreground h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
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
    <div className="bg-muted/50 rounded-md p-2 text-center">
      <p className="text-muted-foreground text-[10px]">{label}</p>
      <p className="text-foreground text-sm font-semibold capitalize">{value}</p>
      <p className="text-muted-foreground text-[9px]">{description}</p>
    </div>
  )
}

function CompensationCard({ level, range }: { level: string; range: string }) {
  return (
    <div className="rounded-md border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-2.5 dark:border-green-800/30 dark:from-green-900/20 dark:to-emerald-900/20">
      <p className="text-muted-foreground text-[10px]">{level}</p>
      <p className="mt-0.5 text-sm font-bold text-green-700 dark:text-green-400">{range}</p>
    </div>
  )
}

function getPaceDescription(pace: "fast" | "moderate" | "relaxed"): string {
  switch (pace) {
    case "fast":
      return "Quick problem solving expected"
    case "moderate":
      return "Balanced pace, thorough discussion"
    case "relaxed":
      return "Time to think and explain"
  }
}
