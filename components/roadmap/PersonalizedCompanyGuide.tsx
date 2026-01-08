"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Brain,
  TrendingUp,
  Zap,
  BookOpen,
  MessageSquare,
  Shield,
  AlertCircle,
  Flame,
  Calendar,
  BarChart3,
  Star,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { PersonalizedCompanyGuide } from "@/lib/roadmap/personalized-guide-generator"
import type { DSAPattern } from "@/lib/types/dsa-patterns"

interface PersonalizedCompanyGuideProps {
  guide: PersonalizedCompanyGuide
  defaultExpanded?: boolean
}

/**
 * Pattern display names
 */
const PATTERN_NAMES: Record<string, string> = {
  "arrays-hashing": "Arrays & Hashing",
  "two-pointers": "Two Pointers",
  "sliding-window": "Sliding Window",
  "binary-search": "Binary Search",
  stack: "Stack",
  trees: "Trees",
  bfs: "BFS",
  dfs: "DFS",
  graphs: "Graphs",
  "dp-1d": "DP (1D)",
  "dp-2d": "DP (2D)",
  heap: "Heap/Priority Queue",
  greedy: "Greedy",
  backtracking: "Backtracking",
  intervals: "Intervals",
  "linked-list": "Linked List",
  string: "Strings",
  trie: "Trie",
  "union-find": "Union Find",
  sorting: "Sorting",
}

export function PersonalizedCompanyGuide({
  guide,
  defaultExpanded = true,
}: PersonalizedCompanyGuideProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    timeStrategy: defaultExpanded,
    patterns: false,
    whyQuestions: false,
    tips: false,
    insights: false,
    recommendations: true,
  })

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const {
    timeStrategy,
    prioritizedPatterns,
    questionSelectionRationale,
    personalizedTips,
    companyInsights,
    adaptiveRecommendations,
  } = guide

  return (
    <div className="space-y-3">
      {/* Time Strategy Banner */}
      <TimeStrategyBanner strategy={timeStrategy} companyName={guide.company.name} />

      {/* Adaptive Recommendations (if any critical ones) */}
      {adaptiveRecommendations.length > 0 && (
        <AdaptiveRecommendationsCard
          recommendations={adaptiveRecommendations}
          expanded={expandedSections.recommendations}
          onToggle={() => toggleSection("recommendations")}
        />
      )}

      {/* Why These Questions */}
      <WhyTheseQuestionsCard
        rationale={questionSelectionRationale}
        companyName={guide.company.name}
        expanded={expandedSections.whyQuestions}
        onToggle={() => toggleSection("whyQuestions")}
      />

      {/* Prioritized Patterns */}
      <PrioritizedPatternsCard
        patterns={prioritizedPatterns}
        companyName={guide.company.name}
        expanded={expandedSections.patterns}
        onToggle={() => toggleSection("patterns")}
      />

      {/* Personalized Tips */}
      <PersonalizedTipsCard
        tips={personalizedTips}
        companyName={guide.company.name}
        expanded={expandedSections.tips}
        onToggle={() => toggleSection("tips")}
      />

      {/* Company Insights */}
      <CompanyInsightsCard
        insights={companyInsights}
        companyName={guide.company.name}
        expanded={expandedSections.insights}
        onToggle={() => toggleSection("insights")}
      />
    </div>
  )
}

/**
 * Time Strategy Banner
 */
function TimeStrategyBanner({
  strategy,
  companyName,
}: {
  strategy: PersonalizedCompanyGuide["timeStrategy"]
  companyName: string
}) {
  const urgencyColors = {
    critical: "from-red-500/20 to-orange-500/20 border-red-500/30",
    high: "from-orange-500/20 to-yellow-500/20 border-orange-500/30",
    moderate: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
    relaxed: "from-green-500/20 to-emerald-500/20 border-green-500/30",
  }

  const urgencyIcons = {
    critical: <Flame className="h-5 w-5 text-red-500" />,
    high: <AlertTriangle className="h-5 w-5 text-orange-500" />,
    moderate: <Clock className="h-5 w-5 text-blue-500" />,
    relaxed: <CheckCircle className="h-5 w-5 text-green-500" />,
  }

  const phaseDescriptions = {
    crunch: "Crunch Mode",
    focused: "Focused Sprint",
    comprehensive: "Comprehensive Prep",
    thorough: "Thorough Mastery",
  }

  return (
    <div
      className={cn("rounded-xl border bg-gradient-to-r p-4", urgencyColors[strategy.urgencyLevel])}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {urgencyIcons[strategy.urgencyLevel]}
          <div>
            <h3 className="text-sm font-semibold">
              {strategy.daysRemaining} Days Until {companyName} Interview
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {phaseDescriptions[strategy.phase]} • {strategy.dailyRecommendation}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span
            className={cn(
              "rounded-full px-2 py-1 text-xs font-medium",
              strategy.urgencyLevel === "critical" &&
                "bg-red-500/20 text-red-700 dark:text-red-400",
              strategy.urgencyLevel === "high" &&
                "bg-orange-500/20 text-orange-700 dark:text-orange-400",
              strategy.urgencyLevel === "moderate" &&
                "bg-blue-500/20 text-blue-700 dark:text-blue-400",
              strategy.urgencyLevel === "relaxed" &&
                "bg-green-500/20 text-green-700 dark:text-green-400"
            )}
          >
            {strategy.urgencyLevel.toUpperCase()}
          </span>
        </div>
      </div>

      {strategy.warningMessage && (
        <div className="bg-background/50 border-border/50 mt-3 rounded-lg border p-2">
          <p className="text-foreground flex items-start gap-2 text-xs">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            {strategy.warningMessage}
          </p>
        </div>
      )}

      {/* Weekly Milestones Preview */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {strategy.weeklyMilestones.slice(0, 4).map((milestone, i) => (
          <div key={i} className="text-muted-foreground flex items-center gap-2 text-[10px]">
            <Calendar className="h-3 w-3 shrink-0" />
            <span className="truncate">{milestone}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Adaptive Recommendations Card
 */
function AdaptiveRecommendationsCard({
  recommendations,
  expanded,
  onToggle,
}: {
  recommendations: PersonalizedCompanyGuide["adaptiveRecommendations"]
  expanded: boolean
  onToggle: () => void
}) {
  const typeConfig = {
    "speed-up": { icon: Zap, color: "text-orange-500", bg: "bg-orange-500/10" },
    "slow-down": { icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10" },
    pivot: { icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10" },
    maintain: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
    review: { icon: BookOpen, color: "text-amber-500", bg: "bg-amber-500/10" },
  }

  const criticalRecommendations = recommendations.filter(
    (r) => r.type === "pivot" || r.type === "speed-up"
  )

  return (
    <CollapsibleCard
      title="Action Required"
      icon={AlertTriangle}
      iconColor="text-amber-500"
      badge={
        criticalRecommendations.length > 0
          ? `${criticalRecommendations.length} critical`
          : undefined
      }
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        {recommendations.map((rec, i) => {
          const config = typeConfig[rec.type]
          const Icon = config.icon

          return (
            <div key={i} className={cn("rounded-lg p-3", config.bg)}>
              <div className="flex items-start gap-2">
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.color)} />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium">{rec.message}</p>
                  <ul className="mt-2 space-y-1">
                    {rec.actionItems.map((item, j) => (
                      <li
                        key={j}
                        className="text-muted-foreground flex items-start gap-1.5 text-xs"
                      >
                        <span className="text-primary">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </CollapsibleCard>
  )
}

/**
 * Why These Questions Card
 */
function WhyTheseQuestionsCard({
  rationale,
  companyName,
  expanded,
  onToggle,
}: {
  rationale: PersonalizedCompanyGuide["questionSelectionRationale"]
  companyName: string
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <CollapsibleCard
      title="Why These Questions?"
      icon={Brain}
      iconColor="text-purple-500"
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-2">
          <StatBox label="Total" value={rationale.totalQuestions} />
          <StatBox label="Easy" value={rationale.byDifficulty.easy} color="text-green-500" />
          <StatBox label="Medium" value={rationale.byDifficulty.medium} color="text-yellow-500" />
          <StatBox label="Hard" value={rationale.byDifficulty.hard} color="text-red-500" />
        </div>

        {/* Priority Breakdown */}
        <div className="bg-muted/50 rounded-lg p-3">
          <h4 className="text-muted-foreground mb-2 text-xs font-medium">Priority Distribution</h4>
          <div className="flex items-center gap-1">
            <PriorityBar
              label="Critical"
              count={rationale.byPriority.critical}
              total={rationale.totalQuestions}
              color="bg-red-500"
            />
            <PriorityBar
              label="High"
              count={rationale.byPriority.high}
              total={rationale.totalQuestions}
              color="bg-orange-500"
            />
            <PriorityBar
              label="Medium"
              count={rationale.byPriority.medium}
              total={rationale.totalQuestions}
              color="bg-blue-500"
            />
            <PriorityBar
              label="Low"
              count={rationale.byPriority.low}
              total={rationale.totalQuestions}
              color="bg-gray-400"
            />
          </div>
        </div>

        {/* Top Reasons */}
        <div>
          <h4 className="text-muted-foreground mb-2 flex items-center gap-1 text-xs font-medium">
            <Lightbulb className="h-3 w-3" />
            Selection Rationale
          </h4>
          <ul className="space-y-1.5">
            {rationale.topReasons.map((reason, i) => (
              <li key={i} className="text-foreground flex items-start gap-2 text-xs">
                <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* Company Alignment */}
        <div className="bg-primary/5 border-primary/20 rounded-lg border p-2">
          <p className="text-foreground flex items-start gap-2 text-xs">
            <Target className="text-primary mt-0.5 h-3 w-3 shrink-0" />
            {rationale.companyAlignment}
          </p>
        </div>
      </div>
    </CollapsibleCard>
  )
}

/**
 * Prioritized Patterns Card
 */
function PrioritizedPatternsCard({
  patterns,
  companyName,
  expanded,
  onToggle,
}: {
  patterns: PersonalizedCompanyGuide["prioritizedPatterns"]
  companyName: string
  expanded: boolean
  onToggle: () => void
}) {
  const criticalPatterns = patterns.filter((p) => p.priority === "critical")
  const highPatterns = patterns.filter((p) => p.priority === "high")

  return (
    <CollapsibleCard
      title="Your Pattern Priorities"
      icon={BarChart3}
      iconColor="text-blue-500"
      badge={`${criticalPatterns.length} critical gaps`}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="space-y-2">
        {patterns.slice(0, 8).map((pattern, i) => (
          <PatternRow key={pattern.pattern} pattern={pattern} rank={i + 1} />
        ))}
      </div>

      {patterns.length > 8 && (
        <p className="text-muted-foreground mt-3 text-center text-xs">
          +{patterns.length - 8} more patterns
        </p>
      )}
    </CollapsibleCard>
  )
}

/**
 * Pattern Row Component
 */
function PatternRow({
  pattern,
  rank,
}: {
  pattern: PersonalizedCompanyGuide["prioritizedPatterns"][0]
  rank: number
}) {
  const [showTips, setShowTips] = useState(false)

  const priorityColors = {
    critical: "border-l-red-500 bg-red-500/5",
    high: "border-l-orange-500 bg-orange-500/5",
    medium: "border-l-blue-500 bg-blue-500/5",
    low: "border-l-gray-400 bg-gray-500/5",
  }

  const levelBadges = {
    unknown: { text: "New", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    seen: {
      text: "Seen",
      color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    },
    practiced: {
      text: "Practiced",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    confident: {
      text: "Strong",
      color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
  }

  const levelBadge = levelBadges[pattern.userLevel]

  return (
    <div className={cn("rounded-r-lg border-l-2 p-2", priorityColors[pattern.priority])}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-muted-foreground w-4 text-xs font-bold">#{rank}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-foreground truncate text-sm font-medium">
                {PATTERN_NAMES[pattern.pattern] || pattern.pattern}
              </span>
              <span
                className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", levelBadge.color)}
              >
                {levelBadge.text}
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[10px]">
              {pattern.reasoning}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <div className="text-foreground text-xs font-semibold">{pattern.companyFrequency}%</div>
            <div className="text-muted-foreground text-[9px]">frequency</div>
          </div>
          <button
            onClick={() => setShowTips(!showTips)}
            className="hover:bg-background/50 rounded p-1"
          >
            <Info className="text-muted-foreground h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showTips && pattern.tips.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-border/50 mt-2 border-t pt-2">
              <p className="text-muted-foreground mb-1 text-[10px] font-medium">
                Tips for {PATTERN_NAMES[pattern.pattern] || pattern.pattern}:
              </p>
              <ul className="space-y-0.5">
                {pattern.tips.slice(0, 3).map((tip, i) => (
                  <li key={i} className="text-muted-foreground flex items-start gap-1 text-[10px]">
                    <Lightbulb className="mt-0.5 h-2.5 w-2.5 shrink-0 text-yellow-500" />
                    {tip}
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-1 text-[10px]">
                Estimated: ~{pattern.estimatedHoursToLearn}h to{" "}
                {pattern.userLevel === "unknown" ? "learn" : "master"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Personalized Tips Card
 */
function PersonalizedTipsCard({
  tips,
  companyName,
  expanded,
  onToggle,
}: {
  tips: PersonalizedCompanyGuide["personalizedTips"]
  companyName: string
  expanded: boolean
  onToggle: () => void
}) {
  const categoryIcons = {
    preparation: BookOpen,
    "during-interview": MessageSquare,
    technical: Brain,
    behavioral: Star,
    mindset: Lightbulb,
  }

  const categoryColors = {
    preparation: "bg-blue-500/10 text-blue-500",
    "during-interview": "bg-green-500/10 text-green-500",
    technical: "bg-purple-500/10 text-purple-500",
    behavioral: "bg-amber-500/10 text-amber-500",
    mindset: "bg-cyan-500/10 text-cyan-500",
  }

  return (
    <CollapsibleCard
      title={`Your ${companyName} Tips`}
      icon={Lightbulb}
      iconColor="text-yellow-500"
      badge={`${tips.length} personalized`}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="space-y-2">
        {tips.slice(0, 8).map((tip, i) => {
          const Icon = categoryIcons[tip.category]
          return (
            <div key={i} className="bg-muted/30 flex items-start gap-2 rounded-lg p-2">
              <div className={cn("rounded p-1", categoryColors[tip.category])}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-xs">{tip.tip}</p>
                <p className="text-muted-foreground mt-0.5 text-[10px] italic">{tip.reason}</p>
              </div>
            </div>
          )
        })}
      </div>
    </CollapsibleCard>
  )
}

/**
 * Company Insights Card
 */
function CompanyInsightsCard({
  insights,
  companyName,
  expanded,
  onToggle,
}: {
  insights: PersonalizedCompanyGuide["companyInsights"]
  companyName: string
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <CollapsibleCard
      title={`${companyName} Interview DNA`}
      icon={Shield}
      iconColor="text-indigo-500"
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        {/* Interview Signature */}
        <div className="from-primary/10 border-primary/20 rounded-lg border bg-gradient-to-r to-transparent p-3">
          <p className="text-foreground text-sm">{insights.interviewSignature}</p>
        </div>

        {/* Success Factors */}
        <div>
          <h4 className="mb-2 flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            Success Factors
          </h4>
          <ul className="space-y-1">
            {insights.successFactors.map((factor, i) => (
              <li key={i} className="text-muted-foreground flex items-start gap-2 text-xs">
                <span className="text-green-500">+</span>
                {factor}
              </li>
            ))}
          </ul>
        </div>

        {/* Common Mistakes */}
        <div>
          <h4 className="mb-2 flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
            <AlertCircle className="h-3 w-3" />
            Common Mistakes
          </h4>
          <ul className="space-y-1">
            {insights.commonMistakes.map((mistake, i) => (
              <li key={i} className="text-muted-foreground flex items-start gap-2 text-xs">
                <span className="text-red-500">-</span>
                {mistake}
              </li>
            ))}
          </ul>
        </div>

        {/* Hidden Expectations */}
        {insights.hiddenExpectations.length > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2">
            <h4 className="mb-1.5 flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              <Star className="h-3 w-3" />
              Hidden Expectations
            </h4>
            <ul className="space-y-1">
              {insights.hiddenExpectations.map((expectation, i) => (
                <li key={i} className="text-foreground flex items-start gap-2 text-[11px]">
                  <span className="text-amber-500">!</span>
                  {expectation}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </CollapsibleCard>
  )
}

/**
 * Collapsible Card Component
 */
function CollapsibleCard({
  title,
  icon: Icon,
  iconColor,
  badge,
  expanded,
  onToggle,
  children,
}: {
  title: string
  icon: typeof Target
  iconColor: string
  badge?: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="bg-card border-border overflow-hidden rounded-xl border">
      <button
        onClick={onToggle}
        className="hover:bg-muted/50 flex w-full items-center justify-between px-4 py-3 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", iconColor)} />
          <span className="text-foreground text-sm font-medium">{title}</span>
          {badge && (
            <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-[10px]">
              {badge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="text-muted-foreground h-4 w-4" />
        ) : (
          <ChevronDown className="text-muted-foreground h-4 w-4" />
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
            <div className="border-border border-t px-4 pt-3 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Helper Components
 */
function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-2 text-center">
      <div className={cn("text-lg font-bold", color || "text-foreground")}>{value}</div>
      <div className="text-muted-foreground text-[10px]">{label}</div>
    </div>
  )
}

function PriorityBar({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0

  return (
    <div className="flex-1">
      <div
        className={cn("h-2 rounded-full", color)}
        style={{ width: `${Math.max(percentage, 5)}%` }}
      />
      <p className="text-muted-foreground mt-1 text-center text-[9px]">
        {count} {label}
      </p>
    </div>
  )
}
