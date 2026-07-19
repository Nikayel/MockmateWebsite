/**
 * Notification & Spaced Repetition Knowledge Base
 *
 * Comprehensive knowledge for RAG-powered notifications and learning optimization.
 * Based on proven learning science: SM-2 algorithm, Ebbinghaus forgetting curve,
 * and spaced repetition research.
 */

import type { DSAPattern } from "@/lib/types/dsa-patterns"

/**
 * Spaced Repetition Intervals (in days)
 * Based on SM-2 algorithm with modifications for coding interview prep
 */
export interface SpacedRepetitionSchedule {
  id: string
  name: string
  description: string
  intervals: number[] // Days between reviews
  forScenario: "new_problem" | "struggling" | "moderate" | "mastered" | "pre_interview"
  adaptiveRules: AdaptiveRule[]
}

export interface AdaptiveRule {
  condition: string
  adjustment: string
  rationale: string
}

/**
 * Notification Types for interview prep
 */
export interface NotificationKnowledge {
  type: NotificationType
  name: string
  description: string
  priority: "critical" | "high" | "medium" | "low"
  triggers: NotificationTrigger[]
  messageTemplates: MessageTemplate[]
  timing: NotificationTiming
  frequency: NotificationFrequency
}

export type NotificationType =
  | "welcome" // Welcome notification for new users
  | "spaced_repetition_review" // Time to review a problem you solved before
  | "pattern_decay_alert" // Pattern proficiency is declining
  | "daily_practice_reminder" // Daily practice nudge
  | "streak_maintenance" // Keep your streak going
  | "interview_countdown" // X days until interview
  | "milestone_celebration" // Celebrate achievements
  | "weak_pattern_focus" // Focus on struggling patterns
  | "roadmap_behind" // Falling behind schedule
  | "optimal_review_time" // Best time to review based on forgetting curve
  | "new_challenge_unlock" // Ready for harder problems
  | "rest_reminder" // Prevent burnout
  | "mock_interview_due" // Time for a mock interview

export interface NotificationTrigger {
  event: string
  conditions: string[]
  dataRequired: string[]
}

export interface MessageTemplate {
  tone: "motivational" | "informative" | "urgent" | "celebratory" | "supportive"
  template: string
  variables: string[]
}

export interface NotificationTiming {
  optimalHours: number[] // Best hours to send (24h format)
  avoidHours: number[] // Never send during these hours
  timezone: "user_local" // Always respect user timezone
  batchable: boolean // Can be combined with other notifications
}

export interface NotificationFrequency {
  maxPerDay: number
  minIntervalHours: number
  cooldownAfterDismiss: number // Hours to wait after user dismisses
}

/**
 * Spaced Repetition Schedules for Different Scenarios
 */
export const SPACED_REPETITION_SCHEDULES: SpacedRepetitionSchedule[] = [
  {
    id: "new-problem",
    name: "New Problem Learning",
    description: "Optimal schedule for problems just solved for the first time",
    intervals: [1, 3, 7, 14, 30], // Review after 1 day, 3 days, 7 days, 14 days, 30 days
    forScenario: "new_problem",
    adaptiveRules: [
      {
        condition: "Solved correctly on first attempt",
        adjustment: "Skip first interval, start at 3 days",
        rationale: "Strong initial understanding indicates faster consolidation",
      },
      {
        condition: "Needed hints to solve",
        adjustment: "Add extra review at day 2",
        rationale: "Partial understanding needs more reinforcement",
      },
      {
        condition: "Took over 30 minutes",
        adjustment: "Review again within 24 hours",
        rationale: "Extended struggle indicates weak encoding",
      },
    ],
  },
  {
    id: "struggling-pattern",
    name: "Struggling Pattern Recovery",
    description: "Intensive schedule for patterns where user is underperforming",
    intervals: [1, 2, 4, 7, 14], // More frequent reviews
    forScenario: "struggling",
    adaptiveRules: [
      {
        condition: "Failed same pattern 3+ times",
        adjustment: "Daily review for 1 week with simpler problems first",
        rationale: "Build foundation with easy wins before harder problems",
      },
      {
        condition: "Improving trend detected",
        adjustment: "Gradually extend intervals to standard schedule",
        rationale: "Success breeds confidence, can reduce frequency",
      },
      {
        condition: "Consistently failing despite reviews",
        adjustment: "Trigger prerequisite pattern review",
        rationale: "May be missing foundational concepts",
      },
    ],
  },
  {
    id: "moderate-performance",
    name: "Moderate Performance Maintenance",
    description: "Balanced schedule for patterns with average performance",
    intervals: [2, 5, 10, 21, 45],
    forScenario: "moderate",
    adaptiveRules: [
      {
        condition: "Performance improving",
        adjustment: "Extend intervals by 20%",
        rationale: "Growing mastery allows for spaced-out practice",
      },
      {
        condition: "Performance stable",
        adjustment: "Maintain current intervals",
        rationale: "Consistency is good, maintain rhythm",
      },
      {
        condition: "Performance declining",
        adjustment: "Reduce intervals by 30%, add problem variety",
        rationale: "Prevent further decay with varied practice",
      },
    ],
  },
  {
    id: "mastered-pattern",
    name: "Mastered Pattern Maintenance",
    description: "Minimal maintenance for well-understood patterns",
    intervals: [7, 21, 45, 90],
    forScenario: "mastered",
    adaptiveRules: [
      {
        condition: "Solved quickly and correctly",
        adjustment: "Can extend to 120-day intervals",
        rationale: "Truly mastered patterns need minimal maintenance",
      },
      {
        condition: "Struggled after long break",
        adjustment: "Reset to moderate schedule",
        rationale: "Long gaps can cause skill decay even in mastered patterns",
      },
      {
        condition: "Interview within 2 weeks",
        adjustment: "Force review regardless of mastery",
        rationale: "Pre-interview refresh is always valuable",
      },
    ],
  },
  {
    id: "pre-interview",
    name: "Pre-Interview Intensive",
    description: "Condensed review schedule for the week before interview",
    intervals: [0, 1, 2, 3], // Daily reviews in final days
    forScenario: "pre_interview",
    adaptiveRules: [
      {
        condition: "Interview in 7 days",
        adjustment: "Focus on must-know problems and weak patterns",
        rationale: "Maximize retention for interview day",
      },
      {
        condition: "Interview in 3 days",
        adjustment: "Light review only, focus on confidence",
        rationale: "Cramming hurts more than helps at this stage",
      },
      {
        condition: "Interview in 1 day",
        adjustment: "Rest day with optional light review",
        rationale: "Mental freshness is more important than last-minute studying",
      },
    ],
  },
]

/**
 * Notification Knowledge Base for RAG
 */
export const NOTIFICATION_KNOWLEDGE: NotificationKnowledge[] = [
  {
    type: "spaced_repetition_review",
    name: "Spaced Repetition Review",
    description: "Reminds user to review a problem based on the forgetting curve",
    priority: "high",
    triggers: [
      {
        event: "scheduled_review_due",
        conditions: [
          "Current time >= scheduled review time",
          "User has not reviewed this problem yet today",
          "Problem is not marked as mastered with 90+ day interval",
        ],
        dataRequired: ["problemId", "pattern", "lastAttemptDate", "previousScore", "intervalDays"],
      },
      {
        event: "forgetting_curve_threshold",
        conditions: [
          "Estimated retention < 80%",
          "More than X days since last review (based on performance)",
        ],
        dataRequired: ["problemId", "pattern", "estimatedRetention", "daysSinceLastReview"],
      },
    ],
    messageTemplates: [
      {
        tone: "motivational",
        template:
          "Time to reinforce your {pattern} skills! Review '{problemName}' - you solved this {daysSince} days ago. A quick review now will lock it in for your interview.",
        variables: ["pattern", "problemName", "daysSince"],
      },
      {
        tone: "informative",
        template:
          "Based on the forgetting curve, your retention of '{problemName}' ({pattern}) is at ~{retention}%. A 10-minute review now will boost it back to 95%+.",
        variables: ["problemName", "pattern", "retention"],
      },
      {
        tone: "supportive",
        template:
          "Remember '{problemName}'? You crushed it {daysSince} days ago! Let's keep that {pattern} pattern fresh in your mind.",
        variables: ["problemName", "daysSince", "pattern"],
      },
    ],
    timing: {
      optimalHours: [9, 10, 11, 14, 15, 16, 19, 20], // Morning, afternoon, early evening
      avoidHours: [0, 1, 2, 3, 4, 5, 6, 22, 23], // Late night / early morning
      timezone: "user_local",
      batchable: true,
    },
    frequency: {
      maxPerDay: 3, // Max 3 review notifications per day
      minIntervalHours: 4, // At least 4 hours between review notifications
      cooldownAfterDismiss: 24, // Wait 24 hours if user dismisses
    },
  },
  {
    type: "pattern_decay_alert",
    name: "Pattern Decay Alert",
    description: "Warns when a pattern proficiency is declining",
    priority: "high",
    triggers: [
      {
        event: "pattern_trend_declining",
        conditions: [
          'Pattern proficiency trend = "declining"',
          "Last 3 attempts show decreasing scores",
          'Pattern is not at "novice" level already',
        ],
        dataRequired: ["pattern", "currentLevel", "recentScores", "daysSincePractice"],
      },
      {
        event: "pattern_inactivity",
        conditions: [
          "Pattern not practiced in 14+ days",
          "Pattern is in user roadmap",
          "Pattern is not mastered (expert level)",
        ],
        dataRequired: ["pattern", "lastPracticeDate", "proficiencyLevel"],
      },
    ],
    messageTemplates: [
      {
        tone: "urgent",
        template:
          "Your {pattern} skills are slipping! You were at {previousLevel} but recent attempts show decline. Let's fix this with targeted practice today.",
        variables: ["pattern", "previousLevel"],
      },
      {
        tone: "supportive",
        template:
          "It's been {daysSince} days since you practiced {pattern}. Don't let your hard work fade - a 15-minute session will keep you sharp!",
        variables: ["daysSince", "pattern"],
      },
    ],
    timing: {
      optimalHours: [9, 10, 14, 15, 19],
      avoidHours: [0, 1, 2, 3, 4, 5, 6, 7, 22, 23],
      timezone: "user_local",
      batchable: false, // Important enough to send alone
    },
    frequency: {
      maxPerDay: 1,
      minIntervalHours: 24,
      cooldownAfterDismiss: 48,
    },
  },
  {
    type: "daily_practice_reminder",
    name: "Daily Practice Reminder",
    description: "Gentle daily nudge to maintain practice habit",
    priority: "medium",
    triggers: [
      {
        event: "no_practice_today",
        conditions: [
          "User has not practiced today",
          "Current time is within user preferred practice window",
          "User has active roadmap",
        ],
        dataRequired: ["lastPracticeDate", "streakDays", "todaysPlan"],
      },
    ],
    messageTemplates: [
      {
        tone: "motivational",
        template:
          "Your daily practice awaits! Today's focus: {todayPattern}. You're on a {streakDays}-day streak - keep it going!",
        variables: ["todayPattern", "streakDays"],
      },
      {
        tone: "informative",
        template:
          "Ready for today's session? You have {problemCount} problems planned in {pattern}. Estimated time: {estimatedTime} minutes.",
        variables: ["problemCount", "pattern", "estimatedTime"],
      },
    ],
    timing: {
      optimalHours: [8, 9, 10, 18, 19, 20],
      avoidHours: [0, 1, 2, 3, 4, 5, 6, 22, 23],
      timezone: "user_local",
      batchable: true,
    },
    frequency: {
      maxPerDay: 2,
      minIntervalHours: 6,
      cooldownAfterDismiss: 12,
    },
  },
  {
    type: "streak_maintenance",
    name: "Streak Maintenance",
    description: "Encourages maintaining practice streaks",
    priority: "medium",
    triggers: [
      {
        event: "streak_at_risk",
        conditions: [
          "User has 3+ day streak",
          "Less than 4 hours until day ends",
          "User has not practiced today",
        ],
        dataRequired: ["streakDays", "hoursRemaining"],
      },
    ],
    messageTemplates: [
      {
        tone: "urgent",
        template:
          "Don't break your {streakDays}-day streak! You have {hoursRemaining} hours left. Even one problem counts!",
        variables: ["streakDays", "hoursRemaining"],
      },
      {
        tone: "motivational",
        template:
          "You're on fire with a {streakDays}-day streak! Keep the momentum - quick practice session before midnight?",
        variables: ["streakDays"],
      },
    ],
    timing: {
      optimalHours: [19, 20, 21],
      avoidHours: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      timezone: "user_local",
      batchable: false,
    },
    frequency: {
      maxPerDay: 1,
      minIntervalHours: 12,
      cooldownAfterDismiss: 24,
    },
  },
  {
    type: "interview_countdown",
    name: "Interview Countdown",
    description: "Countdown reminders as interview approaches",
    priority: "critical",
    triggers: [
      {
        event: "interview_milestone",
        conditions: ["Days until interview in [30, 14, 7, 3, 1]", "User has interview date set"],
        dataRequired: ["interviewDate", "companyName", "daysRemaining", "progressPercent"],
      },
    ],
    messageTemplates: [
      {
        tone: "informative",
        template:
          "{daysRemaining} days until your {companyName} interview! You're {progressPercent}% through your roadmap. {recommendation}",
        variables: ["daysRemaining", "companyName", "progressPercent", "recommendation"],
      },
      {
        tone: "motivational",
        template:
          "1 week to go for {companyName}! Focus on {topWeakPattern} - it's frequently asked. You've got this!",
        variables: ["companyName", "topWeakPattern"],
      },
    ],
    timing: {
      optimalHours: [9, 10],
      avoidHours: [0, 1, 2, 3, 4, 5, 6, 7, 22, 23],
      timezone: "user_local",
      batchable: false,
    },
    frequency: {
      maxPerDay: 1,
      minIntervalHours: 24,
      cooldownAfterDismiss: 0, // Always send countdown notifications
    },
  },
  {
    type: "milestone_celebration",
    name: "Milestone Celebration",
    description: "Celebrates user achievements and progress",
    priority: "medium",
    triggers: [
      {
        event: "milestone_reached",
        conditions: [
          "User completed milestone (pattern mastery, problems solved, streak)",
          "Milestone has not been celebrated yet",
        ],
        dataRequired: ["milestoneType", "milestoneValue", "nextMilestone"],
      },
    ],
    messageTemplates: [
      {
        tone: "celebratory",
        template:
          "🎉 Amazing! You've mastered {pattern}! That's {totalMastered} patterns down. Next up: {nextPattern}!",
        variables: ["pattern", "totalMastered", "nextPattern"],
      },
      {
        tone: "celebratory",
        template:
          "🔥 {problemCount} problems solved! You're in the top {percentile}% of CodeSparring users. Keep crushing it!",
        variables: ["problemCount", "percentile"],
      },
      {
        tone: "celebratory",
        template:
          "🔥 {streakDays}-day streak! Your consistency is paying off. Keep the momentum going!",
        variables: ["streakDays"],
      },
    ],
    timing: {
      optimalHours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      avoidHours: [0, 1, 2, 3, 4, 5, 6, 22, 23],
      timezone: "user_local",
      batchable: false, // Celebrations deserve their own moment
    },
    frequency: {
      maxPerDay: 3,
      minIntervalHours: 2,
      cooldownAfterDismiss: 0,
    },
  },
  {
    type: "weak_pattern_focus",
    name: "Weak Pattern Focus",
    description: "Suggests focusing on underperforming patterns",
    priority: "high",
    triggers: [
      {
        event: "weak_pattern_detected",
        conditions: [
          "Pattern success rate < 50%",
          "User has attempted pattern 3+ times",
          "Pattern is in target company top patterns",
        ],
        dataRequired: ["pattern", "successRate", "attemptCount", "companyFrequency"],
      },
    ],
    messageTemplates: [
      {
        tone: "supportive",
        template:
          "{pattern} appears in {companyFrequency}% of {companyName} interviews, but your success rate is {successRate}%. Let's work on this together!",
        variables: ["pattern", "companyFrequency", "companyName", "successRate"],
      },
      {
        tone: "informative",
        template:
          "Opportunity alert! Improving {pattern} from {currentLevel} to {targetLevel} could significantly boost your interview readiness.",
        variables: ["pattern", "currentLevel", "targetLevel"],
      },
    ],
    timing: {
      optimalHours: [9, 10, 14, 15],
      avoidHours: [0, 1, 2, 3, 4, 5, 6, 7, 21, 22, 23],
      timezone: "user_local",
      batchable: true,
    },
    frequency: {
      maxPerDay: 1,
      minIntervalHours: 48,
      cooldownAfterDismiss: 72,
    },
  },
  {
    type: "roadmap_behind",
    name: "Roadmap Behind Schedule",
    description: "Alerts when user is falling behind their roadmap",
    priority: "high",
    triggers: [
      {
        event: "behind_schedule",
        conditions: [
          "Actual progress < expected progress by 15%+",
          "Interview date is set",
          "More than 7 days until interview",
        ],
        dataRequired: ["expectedProgress", "actualProgress", "daysRemaining", "catchUpPlan"],
      },
    ],
    messageTemplates: [
      {
        tone: "urgent",
        template:
          "You're {behindPercent}% behind schedule with {daysRemaining} days left. To catch up, try to complete {extraProblemsPerDay} extra problems daily.",
        variables: ["behindPercent", "daysRemaining", "extraProblemsPerDay"],
      },
      {
        tone: "supportive",
        template:
          "A bit behind schedule, but totally recoverable! Focus on must-know problems in {priorityPatterns}. Quality over quantity.",
        variables: ["priorityPatterns"],
      },
    ],
    timing: {
      optimalHours: [9, 10, 19, 20],
      avoidHours: [0, 1, 2, 3, 4, 5, 6, 7, 22, 23],
      timezone: "user_local",
      batchable: false,
    },
    frequency: {
      maxPerDay: 1,
      minIntervalHours: 24,
      cooldownAfterDismiss: 48,
    },
  },
  {
    type: "optimal_review_time",
    name: "Optimal Review Window",
    description: "Notifies when it is the scientifically optimal time to review",
    priority: "medium",
    triggers: [
      {
        event: "optimal_retention_window",
        conditions: [
          "Problem retention at 75-85% (optimal review point)",
          "User is typically active at this hour",
          "No review notification sent in last 4 hours",
        ],
        dataRequired: ["problemId", "pattern", "retentionEstimate", "optimalReviewWindow"],
      },
    ],
    messageTemplates: [
      {
        tone: "informative",
        template:
          "Perfect timing! Your memory of '{problemName}' is at the ideal point for review. A quick 5-min refresh now = maximum retention.",
        variables: ["problemName"],
      },
    ],
    timing: {
      optimalHours: [9, 10, 11, 14, 15, 16, 19, 20],
      avoidHours: [0, 1, 2, 3, 4, 5, 6, 7, 22, 23],
      timezone: "user_local",
      batchable: true,
    },
    frequency: {
      maxPerDay: 2,
      minIntervalHours: 6,
      cooldownAfterDismiss: 24,
    },
  },
  {
    type: "rest_reminder",
    name: "Rest Reminder",
    description: "Prevents burnout by suggesting rest",
    priority: "medium",
    triggers: [
      {
        event: "overwork_detected",
        conditions: [
          "User practiced 3+ hours today",
          "Or user practiced 7+ consecutive days",
          "Or performance declining despite high effort",
        ],
        dataRequired: ["practiceHoursToday", "consecutiveDays", "recentTrend"],
      },
      {
        event: "pre_interview_rest",
        conditions: ["Interview in 1 day", "User has practiced today"],
        dataRequired: ["interviewDate"],
      },
    ],
    messageTemplates: [
      {
        tone: "supportive",
        template:
          "You've been crushing it with {consecutiveDays} days straight! Your brain needs rest to consolidate learning. Take tomorrow lighter.",
        variables: ["consecutiveDays"],
      },
      {
        tone: "informative",
        template:
          "Interview tomorrow! You're well prepared. Rest today - a fresh mind performs 20% better. Light review only if needed.",
        variables: [],
      },
    ],
    timing: {
      optimalHours: [20, 21],
      avoidHours: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      timezone: "user_local",
      batchable: false,
    },
    frequency: {
      maxPerDay: 1,
      minIntervalHours: 24,
      cooldownAfterDismiss: 48,
    },
  },
]

/**
 * Learning Science Knowledge for RAG Context
 */
export interface LearningPrinciple {
  id: string
  name: string
  description: string
  applicationToInterviewPrep: string
  practicalTips: string[]
  scientificBasis: string
}

export const LEARNING_SCIENCE_KNOWLEDGE: LearningPrinciple[] = [
  {
    id: "spacing-effect",
    name: "Spacing Effect",
    description:
      "Learning is more effective when practice is spaced out over time rather than crammed.",
    applicationToInterviewPrep:
      "Review solved problems at increasing intervals (1→3→7→14→30 days) rather than solving new problems daily without review.",
    practicalTips: [
      "After solving a problem, schedule review for next day",
      "Each successful review extends the next interval",
      "Struggling extends short intervals, success extends long",
      "Even 5-minute reviews are effective",
    ],
    scientificBasis:
      "Ebbinghaus (1885), Cepeda et al. (2006) - spacing yields 10-30% better retention than massing",
  },
  {
    id: "testing-effect",
    name: "Testing Effect (Retrieval Practice)",
    description:
      "Actively retrieving information from memory strengthens it more than passive review.",
    applicationToInterviewPrep:
      "When reviewing, try to solve without looking at your previous solution first. Struggle is productive.",
    practicalTips: [
      "Set a 10-minute timer and attempt before checking notes",
      "Write out the approach before looking at code",
      "Explain the solution out loud (like in an interview)",
      "After peeking, close it and try again from memory",
    ],
    scientificBasis:
      "Roediger & Karpicke (2006) - testing produces 50% better retention than restudying",
  },
  {
    id: "interleaving",
    name: "Interleaving",
    description:
      "Mixing different types of problems is more effective than practicing one type repeatedly.",
    applicationToInterviewPrep:
      'Practice mixed patterns daily rather than "DP week" or "Graph week". Mix easy and hard.',
    practicalTips: [
      "Daily practice should include 2-3 different patterns",
      "Alternate between strength and weakness patterns",
      "Mix difficulties: 1 easy, 2 medium, 1 hard per session",
      "Pattern recognition improves with variety",
    ],
    scientificBasis:
      "Rohrer & Taylor (2007) - interleaving yields 43% better transfer to new problems",
  },
  {
    id: "desirable-difficulties",
    name: "Desirable Difficulties",
    description: "Challenges that slow learning initially can enhance long-term retention.",
    applicationToInterviewPrep:
      "Struggle with problems before using hints. The difficulty is part of the learning.",
    practicalTips: [
      "Spend 15-20 minutes before looking at hints",
      "Failed attempts aren't wasted - they prime learning",
      "Harder problems have higher retention value",
      "Vary practice conditions (time limits, no IDE, etc.)",
    ],
    scientificBasis: "Bjork (1994) - introducing difficulties improves retention and transfer",
  },
  {
    id: "forgetting-curve",
    name: "Ebbinghaus Forgetting Curve",
    description: "Memory decays exponentially without review, but each review extends retention.",
    applicationToInterviewPrep:
      "Schedule reviews at strategic intervals to flatten the forgetting curve before your interview.",
    practicalTips: [
      "First review within 24 hours is critical (40% loss otherwise)",
      "Review when retention drops to 70-80% (optimal)",
      "Each review extends retention by ~2x the previous interval",
      "Pre-interview: review everything 3-1 days before",
    ],
    scientificBasis:
      "Ebbinghaus (1885), Pimsleur (1967) - memory follows predictable decay patterns",
  },
  {
    id: "sleep-consolidation",
    name: "Sleep Consolidation",
    description:
      "Sleep is essential for consolidating learning from practice into long-term memory.",
    applicationToInterviewPrep:
      "Avoid late-night cramming. Quality sleep after practice sessions locks in learning.",
    practicalTips: [
      "Practice in morning/afternoon when possible",
      "Review difficult concepts before sleep for consolidation",
      "Night before interview: light review then rest",
      "7-8 hours sleep is worth more than extra practice",
    ],
    scientificBasis: "Walker (2017), Stickgold (2005) - sleep increases skill retention by 20-30%",
  },
]

/**
 * Pattern-Specific Review Strategies
 * Different patterns have different optimal review schedules
 */
export interface PatternReviewStrategy {
  pattern: DSAPattern
  reviewNotes: string
  optimalIntervals: number[]
  prerequisiteReviewTrigger: string[]
  commonDecayIndicators: string[]
}

export const PATTERN_REVIEW_STRATEGIES: PatternReviewStrategy[] = [
  {
    pattern: "dp-2d",
    reviewNotes:
      "DP patterns decay faster than others. Prioritize recurrence relation understanding over code memorization.",
    optimalIntervals: [1, 2, 5, 12, 28],
    prerequisiteReviewTrigger: [
      "Confusion about state definition",
      "Wrong base case",
      "Incorrect recurrence",
    ],
    commonDecayIndicators: [
      "Forgetting to handle base cases",
      "Wrong iteration order",
      "Unable to define state clearly",
    ],
  },
  {
    pattern: "graphs",
    reviewNotes:
      "Graph patterns are retained longer if you understand WHY BFS vs DFS. Review cycle detection regularly.",
    optimalIntervals: [1, 3, 8, 18, 40],
    prerequisiteReviewTrigger: ["Confusion about when to use BFS vs DFS", "Forgetting visited set"],
    commonDecayIndicators: [
      "Infinite loops from missing visited tracking",
      "Wrong traversal choice",
      "Forgetting to build adjacency list",
    ],
  },
  {
    pattern: "sliding-window",
    reviewNotes: "Template-based pattern. Focus on recognizing when to expand vs shrink window.",
    optimalIntervals: [1, 4, 10, 25, 50],
    prerequisiteReviewTrigger: ["Mixing fixed and variable window", "Wrong window update logic"],
    commonDecayIndicators: [
      "Incorrect shrink condition",
      "Off-by-one in window size",
      "Forgetting to update state when element leaves",
    ],
  },
  {
    pattern: "binary-search",
    reviewNotes: 'Easy to forget boundary conditions. Practice "search on answer" variations.',
    optimalIntervals: [2, 5, 12, 30, 60],
    prerequisiteReviewTrigger: ["Infinite loop in implementation", "Wrong mid calculation"],
    commonDecayIndicators: [
      "Incorrect left/right pointer updates",
      "Integer overflow in mid calculation",
      "Wrong loop termination condition",
    ],
  },
  {
    pattern: "backtracking",
    reviewNotes: "Template-based but easy to forget pruning. Visualize the decision tree.",
    optimalIntervals: [1, 3, 7, 18, 40],
    prerequisiteReviewTrigger: [
      "Forgetting to undo choice",
      "Missing base case",
      "Generating duplicates",
    ],
    commonDecayIndicators: [
      "Not restoring state after recursion",
      "Ineffective pruning",
      "Duplicate solutions in output",
    ],
  },
  {
    pattern: "trees",
    reviewNotes:
      "Strong retention due to visual nature. Focus on edge cases (null nodes, single node).",
    optimalIntervals: [2, 6, 15, 35, 70],
    prerequisiteReviewTrigger: ["Confusion about traversal order", "Wrong recursion base case"],
    commonDecayIndicators: [
      "Null pointer exceptions",
      "Wrong traversal order for the problem",
      "Forgetting to handle single-node trees",
    ],
  },
  {
    pattern: "arrays-hashing",
    reviewNotes: "Foundation pattern. Quick to review, high transfer value.",
    optimalIntervals: [3, 8, 20, 45, 90],
    prerequisiteReviewTrigger: ["This is foundational - no prerequisites"],
    commonDecayIndicators: [
      "Using wrong data structure (map vs set)",
      "Edge cases with empty arrays",
      "Not handling duplicates correctly",
    ],
  },
  {
    pattern: "two-pointers",
    reviewNotes: "Intuitive once learned. Focus on when to use opposite-ends vs same-direction.",
    optimalIntervals: [2, 6, 15, 35, 70],
    prerequisiteReviewTrigger: ["Confusion about pointer movement direction"],
    commonDecayIndicators: [
      "Wrong pointer update logic",
      "Off-by-one when pointers meet",
      "Using two-pointers when sorting is needed first",
    ],
  },
  {
    pattern: "heap",
    reviewNotes: "Implementation details fade. Focus on WHEN to use heap, not HOW (use library).",
    optimalIntervals: [2, 5, 12, 28, 55],
    prerequisiteReviewTrigger: ["Confusion about min-heap vs max-heap for the problem"],
    commonDecayIndicators: [
      "Wrong heap type (min vs max)",
      "Overcomplicating with heap when sort works",
      "Forgetting negative trick for max-heap",
    ],
  },
  {
    pattern: "trie",
    reviewNotes: "Specialized pattern. Review before interviews where string problems are common.",
    optimalIntervals: [1, 4, 10, 25, 50],
    prerequisiteReviewTrigger: ["Forgetting end-of-word marker", "Wrong child navigation"],
    commonDecayIndicators: [
      "Missing is_end flag",
      "Wrong traversal for prefix vs full word",
      "Memory structure confusion",
    ],
  },
]

/**
 * Helper: Get optimal review schedule for a given scenario
 */
export function getReviewSchedule(
  scenario: "new_problem" | "struggling" | "moderate" | "mastered" | "pre_interview"
): SpacedRepetitionSchedule | undefined {
  return SPACED_REPETITION_SCHEDULES.find((s) => s.forScenario === scenario)
}

/**
 * Helper: Get notification knowledge by type
 */
export function getNotificationByType(type: NotificationType): NotificationKnowledge | undefined {
  return NOTIFICATION_KNOWLEDGE.find((n) => n.type === type)
}

/**
 * Helper: Get pattern-specific review strategy
 */
export function getPatternReviewStrategy(pattern: DSAPattern): PatternReviewStrategy | undefined {
  return PATTERN_REVIEW_STRATEGIES.find((p) => p.pattern === pattern)
}

/**
 * Convert notification knowledge to RAG document format
 */
export function notificationKnowledgeToDocument(knowledge: NotificationKnowledge): string {
  return `
# Notification Type: ${knowledge.name}

## Description
${knowledge.description}

## Priority
${knowledge.priority}

## Triggers
${knowledge.triggers
  .map(
    (t) => `
### ${t.event}
**Conditions:**
${t.conditions.map((c) => `- ${c}`).join("\n")}

**Data Required:**
${t.dataRequired.map((d) => `- ${d}`).join("\n")}
`
  )
  .join("\n")}

## Message Templates
${knowledge.messageTemplates
  .map(
    (m) => `
### ${m.tone} tone
"${m.template}"
*Variables: ${m.variables.join(", ")}*
`
  )
  .join("\n")}

## Timing
- Optimal hours: ${knowledge.timing.optimalHours.join(", ")}
- Avoid hours: ${knowledge.timing.avoidHours.join(", ")}
- Batchable: ${knowledge.timing.batchable ? "Yes" : "No"}

## Frequency Limits
- Max per day: ${knowledge.frequency.maxPerDay}
- Min interval: ${knowledge.frequency.minIntervalHours} hours
- Cooldown after dismiss: ${knowledge.frequency.cooldownAfterDismiss} hours
`.trim()
}

/**
 * Convert learning principle to RAG document format
 */
export function learningPrincipleToDocument(principle: LearningPrinciple): string {
  return `
# Learning Principle: ${principle.name}

## Description
${principle.description}

## Application to Interview Prep
${principle.applicationToInterviewPrep}

## Practical Tips
${principle.practicalTips.map((t) => `- ${t}`).join("\n")}

## Scientific Basis
${principle.scientificBasis}
`.trim()
}

/**
 * Convert spaced repetition schedule to RAG document format
 */
export function spacedRepetitionToDocument(schedule: SpacedRepetitionSchedule): string {
  return `
# Spaced Repetition Schedule: ${schedule.name}

## Description
${schedule.description}

## Scenario
${schedule.forScenario}

## Intervals (in days)
${schedule.intervals.map((d, i) => `- Review ${i + 1}: Day ${d}`).join("\n")}

## Adaptive Rules
${schedule.adaptiveRules
  .map(
    (r) => `
### Condition: ${r.condition}
**Adjustment:** ${r.adjustment}
**Rationale:** ${r.rationale}
`
  )
  .join("\n")}
`.trim()
}
