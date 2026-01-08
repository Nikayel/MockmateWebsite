"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Trophy,
  PartyPopper,
  BookOpen,
  MessageSquare,
  Users,
  Target,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Brain,
  Mic,
  Play,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { CompanyId } from "@/lib/data/company-questions/types"

interface RoadmapCompleteCardProps {
  companyName: string
  companyId: CompanyId
  questionsCompleted: number
  totalHoursSpent: number
  daysUntilInterview: number
  patternsCovered: number
  onStartMockInterview?: () => void
  onAddMoreQuestions?: () => void
  onStartBehavioralPrep?: () => void
}

/**
 * Card shown when user completes all roadmap questions.
 * Recommends next steps: behavioral prep, mock interviews, review, etc.
 */
export function RoadmapCompleteCard({
  companyName,
  companyId,
  questionsCompleted,
  totalHoursSpent,
  daysUntilInterview,
  patternsCovered,
  onStartMockInterview,
  onAddMoreQuestions,
  onStartBehavioralPrep,
}: RoadmapCompleteCardProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("recommended")

  // Determine recommendations based on time remaining
  const getRecommendations = () => {
    const recommendations: {
      id: string
      title: string
      description: string
      icon: typeof Trophy
      color: string
      priority: "high" | "medium" | "low"
      action?: () => void
      actionLabel?: string
      tips: string[]
    }[] = []

    // Always recommend mock interviews
    recommendations.push({
      id: "mock-interview",
      title: "Mock Interviews",
      description: "Practice with real interview simulations",
      icon: Mic,
      color: "text-purple-500 bg-purple-500/10",
      priority: "high",
      action: onStartMockInterview,
      actionLabel: "Start Mock Interview",
      tips: [
        "Aim for 2-3 mock interviews before the real thing",
        "Practice explaining your thought process out loud",
        "Time yourself - most coding rounds are 45 minutes",
        "Ask a friend to give you unexpected follow-up questions",
      ],
    })

    // Behavioral prep is crucial
    recommendations.push({
      id: "behavioral",
      title: "Behavioral Preparation",
      description: `Prepare ${companyName}-specific stories and answers`,
      icon: MessageSquare,
      color: "text-blue-500 bg-blue-500/10",
      priority: "high",
      action: onStartBehavioralPrep,
      actionLabel: "Prep Behavioral",
      tips: getBehavioralTips(companyId),
    })

    // If more than 3 days, recommend more practice
    if (daysUntilInterview > 3) {
      recommendations.push({
        id: "more-practice",
        title: "Additional Practice",
        description: "Strengthen weak areas with more questions",
        icon: RefreshCw,
        color: "text-orange-500 bg-orange-500/10",
        priority: "medium",
        action: onAddMoreQuestions,
        actionLabel: "Add More Questions",
        tips: [
          "Focus on patterns where you struggled most",
          "Try harder variations of questions you solved",
          "Practice questions from company's recent interviews",
          "Review questions you skipped or got wrong",
        ],
      })
    }

    // Review and consolidate - with science-based strategies
    const reviewStrategies = getReviewStrategies(daysUntilInterview)
    recommendations.push({
      id: "review",
      title:
        daysUntilInterview <= 1
          ? "Final Day: Rest & Confidence"
          : daysUntilInterview <= 3
            ? "Final Stretch: Retrieval Practice"
            : "Review & Consolidate",
      description:
        daysUntilInterview <= 1
          ? "Research shows rest beats cramming - trust your prep"
          : "Science-backed strategies for optimal retention",
      icon: Brain,
      color: "text-green-500 bg-green-500/10",
      priority: daysUntilInterview <= 3 ? "high" : "medium",
      tips: reviewStrategies,
    })

    return recommendations
  }

  const recommendations = getRecommendations()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border-border overflow-hidden rounded-xl border"
    >
      {/* Celebration Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 p-6">
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-green-500/10" />
        <div className="absolute -bottom-5 -left-5 h-20 w-20 rounded-full bg-emerald-500/10" />

        <div className="relative flex items-start gap-4">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg"
          >
            <Trophy className="h-7 w-7 text-white" />
          </motion.div>

          <div className="flex-1">
            <h2 className="text-foreground text-xl font-bold">
              Roadmap Complete!
              <PartyPopper className="ml-2 inline h-5 w-5 text-yellow-500" />
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Amazing work! You've completed all {questionsCompleted} questions for your{" "}
              {companyName} interview prep.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="relative mt-4 grid grid-cols-3 gap-3">
          <StatBadge
            icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
            value={questionsCompleted}
            label="Questions"
          />
          <StatBadge
            icon={<Clock className="h-4 w-4 text-blue-500" />}
            value={`${Math.round(totalHoursSpent)}h`}
            label="Studied"
          />
          <StatBadge
            icon={<Target className="h-4 w-4 text-purple-500" />}
            value={patternsCovered}
            label="Patterns"
          />
        </div>

        {/* Days remaining notice */}
        {daysUntilInterview > 0 && (
          <div className="border-border/50 bg-background/50 mt-4 rounded-lg border p-3">
            <p className="text-foreground text-center text-sm font-medium">
              <Sparkles className="mr-1 inline h-4 w-4 text-yellow-500" />
              {daysUntilInterview} days until your interview - here's how to use them wisely
            </p>
          </div>
        )}
      </div>

      {/* Recommendations Section */}
      <div className="p-4">
        <h3 className="text-foreground mb-3 flex items-center gap-2 text-sm font-semibold">
          <BookOpen className="text-primary h-4 w-4" />
          Recommended Next Steps
        </h3>

        <div className="space-y-2">
          {recommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              expanded={expandedSection === rec.id}
              onToggle={() => setExpandedSection(expandedSection === rec.id ? null : rec.id)}
            />
          ))}
        </div>
      </div>

      {/* Quick Action Footer */}
      {onStartMockInterview && (
        <div className="border-border border-t p-4">
          <button
            onClick={onStartMockInterview}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold shadow-sm transition-all hover:shadow-md"
          >
            <Play className="h-4 w-4" />
            Start a Mock Interview
          </button>
          <p className="text-muted-foreground mt-2 text-center text-xs">
            The best way to solidify your prep is to practice under real conditions
          </p>
        </div>
      )}
    </motion.div>
  )
}

/**
 * Individual recommendation card with expandable tips
 */
function RecommendationCard({
  recommendation,
  expanded,
  onToggle,
}: {
  recommendation: {
    id: string
    title: string
    description: string
    icon: typeof Trophy
    color: string
    priority: "high" | "medium" | "low"
    action?: () => void
    actionLabel?: string
    tips: string[]
  }
  expanded: boolean
  onToggle: () => void
}) {
  const Icon = recommendation.icon

  return (
    <div className="border-border rounded-lg border">
      <button
        onClick={onToggle}
        className="hover:bg-muted/30 flex w-full items-center justify-between p-3 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn("rounded-lg p-2", recommendation.color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-foreground text-sm font-medium">{recommendation.title}</span>
              {recommendation.priority === "high" && (
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  Priority
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-xs">{recommendation.description}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="text-muted-foreground h-4 w-4" />
        ) : (
          <ChevronDown className="text-muted-foreground h-4 w-4" />
        )}
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="border-border border-t"
        >
          <div className="p-3">
            <ul className="space-y-1.5">
              {recommendation.tips.map((tip, i) => (
                <li key={i} className="text-muted-foreground flex items-start gap-2 text-xs">
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                  {tip}
                </li>
              ))}
            </ul>

            {recommendation.action && recommendation.actionLabel && (
              <button
                onClick={recommendation.action}
                className="bg-primary/10 text-primary hover:bg-primary/20 mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              >
                {recommendation.actionLabel}
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

/**
 * Stat badge component
 */
function StatBadge({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string | number
  label: string
}) {
  return (
    <div className="bg-background/50 rounded-lg p-2 text-center">
      <div className="flex items-center justify-center gap-1">
        {icon}
        <span className="text-foreground text-lg font-bold">{value}</span>
      </div>
      <p className="text-muted-foreground text-[10px]">{label}</p>
    </div>
  )
}

/**
 * Get company-specific behavioral tips with science-based advice
 * Sources: Company interview guides, Glassdoor data, recruiter insights
 */
function getBehavioralTips(companyId: CompanyId): string[] {
  const companyTips: Record<string, string[]> = {
    // FAANG+ Companies
    amazon: [
      "Amazon evaluates EVERY round on Leadership Principles - not just behavioral rounds",
      "Prepare 2 stories per LP using STAR: Situation (10%), Task (10%), Action (60%), Result (20%)",
      '"Dive Deep" and "Bias for Action" are most frequently tested - have 3+ stories each',
      'Always quantify impact: "reduced latency by 40%" beats "improved performance"',
      "They WILL ask about failures - prepare stories showing growth, not blame",
      "Bar Raiser round focuses on culture fit - show customer obsession authentically",
    ],
    google: [
      "Googleyness is a real hiring signal: intellectual humility, collaborative, doing right thing",
      "Prepare examples where you changed your mind based on new data",
      '"General Cognitive Ability" = how you think, not what you know - show reasoning',
      "Have stories about navigating ambiguity without clear direction from above",
      "Team match matters - research your specific team's projects and challenges",
      'They value "done is better than perfect" - show shipping velocity stories',
    ],
    meta: [
      "Meta moves FAST - your stories should emphasize speed and iteration",
      '"Move Fast" isn\'t reckless - show calculated risk-taking with learning',
      "Prepare stories about building 0→1 products or features you owned end-to-end",
      "They heavily weight impact - discuss metrics, scale, and business outcomes",
      'System design behavioral: expect "how would you approach building X at scale?"',
      "Show you can disagree and commit - collaborative conflict resolution stories",
    ],
    microsoft: [
      "Growth Mindset is core - show learning from failures and continuous improvement",
      '"Customer Obsession" means actual user stories, not just metrics',
      "Prepare stories showing cross-team collaboration and influence without authority",
      "They value diversity of thought - show how you've included different perspectives",
      "Azure/Cloud focus: if relevant, prepare cloud-scale thinking examples",
      "Ask about the team's current challenges - shows genuine interest",
    ],
    apple: [
      "Attention to detail is PARAMOUNT - sloppy stories = rejection",
      "Product passion is expected - know Apple products you'll work on deeply",
      "Secrecy culture means vague questions - practice pivoting gracefully",
      "Design thinking: show user-centric decision making in technical stories",
      "Cross-functional collaboration is key - Apple teams are highly integrated",
      'They care about craft - discuss times you went beyond "good enough"',
    ],
    netflix: [
      '"Freedom and Responsibility" - show you thrive with minimal oversight',
      "Radical candor is expected - prepare stories about giving/receiving hard feedback",
      "No rules culture means self-direction - show proactive initiative stories",
      "High performance focus: discuss how you've raised the bar on teams",
      "Context over control - show strategic thinking, not just task execution",
      "Keeper Test: would your manager fight to keep you? Prove why",
    ],
    // Top Tech
    stripe: [
      "Stripe values rigorous thinking - prepare to discuss tradeoffs deeply",
      '"Users first" - show product intuition and customer empathy stories',
      "Technical depth matters even in behavioral - be ready for follow-ups",
      "They move fast but carefully - show velocity WITH quality",
      "Prepare for whiteboard coding of realistic Stripe-like problems",
    ],
    uber: [
      '"Great Minds Don\'t Think Alike" - show diverse problem-solving approaches',
      "Uber values scrappiness - discuss doing more with less",
      "Marketplace thinking - show understanding of two-sided dynamics",
      "Be ready to discuss ethics and responsible tech development",
    ],
    airbnb: [
      '"Belong Anywhere" - show empathy and community-building stories',
      "Host/guest perspective - demonstrate user empathy from multiple angles",
      "Design-oriented culture - show you appreciate craft and aesthetics",
      "Prepare stories about creating magical user experiences",
    ],
    linkedin: [
      '"Members First" - user-centric stories are paramount',
      "Professional network context - show networking/relationship-building",
      "Data-driven culture - quantify and measure everything in stories",
      "Act Like an Owner - show entrepreneurial initiative",
    ],
    // Finance/Trading
    "goldman-sachs": [
      '"One GS" culture - collaborative teamwork stories across divisions',
      "Client service excellence - discuss going above and beyond for clients",
      "Integrity and character assessment is rigorous - no ethical gray areas",
      'Prepare for "Why GS?" - show genuine interest in finance',
    ],
    "jane-street": [
      "Puzzle-like behavioral questions - expect unconventional formats",
      "Collaborative problem-solving - show you enjoy working through hard problems",
      "Intellectual curiosity > right answers - show how you think",
      "Be ready for market-making and trading concept discussions",
    ],
    bloomberg: [
      "Terminal/financial data expertise shows you've done homework",
      "Fast-paced environment - show you thrive under pressure",
      "Technical depth is valued highly - don't shy from details",
    ],
  }

  return (
    companyTips[companyId] || [
      "Research the company's stated values and prepare stories for each one",
      "Use STAR format: 60% of time on Action (what YOU did specifically)",
      'Quantify impact with metrics - "improved by X%" is always stronger',
      "Prepare a failure story that shows growth and learning",
      "Have 3 thoughtful questions that show you've researched the role/team",
    ]
  )
}

/**
 * Get science-based review strategies based on days remaining
 * Based on: Spaced repetition research, testing effect, interleaving
 */
function getReviewStrategies(daysRemaining: number): string[] {
  if (daysRemaining <= 1) {
    // Day before - minimize new learning, maximize confidence
    return [
      "NO new problems today - research shows cramming hurts retrieval",
      "Light review only: skim your notes, don't solve problems",
      "Focus on sleep: 7-8 hours improves problem-solving by 40% (Walker, 2017)",
      "Prepare your interview environment and test your setup",
      "Brief visualization: mentally walk through solving a problem",
    ]
  } else if (daysRemaining <= 3) {
    // Final stretch - retrieval practice, no new concepts
    return [
      "Retrieval practice: re-solve 2-3 problems per pattern WITHOUT looking at solutions",
      "Testing effect: self-testing beats re-reading by 50% (Roediger & Karpicke, 2006)",
      "Review mistakes only - don't introduce new problem types",
      "Practice explaining solutions aloud - verbal recall strengthens memory",
      "Spaced review: spread sessions across days, not marathon sessions",
    ]
  } else if (daysRemaining <= 7) {
    // Week out - interleaved practice
    return [
      "Interleaved practice: mix problem types randomly (don't block by pattern)",
      "Interleaving improves transfer by 40% vs blocked practice (Rohrer, 2012)",
      "Desirable difficulty: struggle is good - resist checking solutions quickly",
      "Teach back: explain solutions to rubber duck or friend - strengthens encoding",
      "Sleep consolidation: consistent sleep schedule helps memory consolidation",
    ]
  } else {
    // More than a week - deeper learning
    return [
      "Spaced repetition: review patterns at increasing intervals (1, 3, 7 days)",
      'Elaborative interrogation: ask "why" and "how" for each technique',
      "Varied practice: solve same pattern in different contexts",
      "Generation effect: try solving before looking at approaches",
      "Connect patterns: understand when binary search vs two pointers applies",
    ]
  }
}
