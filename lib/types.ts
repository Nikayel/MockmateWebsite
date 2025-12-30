/**
 * Shared TypeScript types for the application
 */

export interface User {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
  }
}

export interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  subscription_tier: "free" | "pro" | "enterprise"
  subscription_platform?: "website" | "vscode"
  subscription_status?: string
  subscription_type?: "monthly" | "yearly" // Type of subscription: monthly (recurring) or yearly (one-time)
  stripe_customer_id?: string
  stripe_subscription_id?: string
  subscription_start_date?: string // ISO date string when subscription started
  subscription_current_period_end?: string // ISO date string when current period ends
  last_quota_reset?: string // ISO date string when quota was last reset (for yearly subscriptions)
  created_at: string
  updated_at: string
  // Onboarding fields
  role?: "student" | "junior" | "mid" | "senior"
  goal?: "faang" | "startup" | "general" | "promotion"
  target_company?: string // Target company for FAANG goal (Google, Meta, etc.)
  daily_goal?: number // Daily practice goal (1, 3, 5 problems)
  onboarding_completed?: boolean
  onboarding_completed_at?: string
  // Product tour fields
  tour_completed?: boolean
  tour_skipped?: boolean
  tour_completed_at?: string
  // Email notification preferences
  notification_preferences?: NotificationPreferences
  last_email_sent_at?: string
  emails_sent_today?: number
  welcome_email_sent?: boolean
  // Spaced Repetition Algorithm A/B Testing
  spaced_repetition_algorithm?: 'sm2' | 'fsrs'  // Assigned algorithm for A/B testing
  algorithm_assigned_at?: string                  // ISO date when algorithm was assigned
  algorithm_user_overridden?: boolean             // True if user manually changed algorithm
}

export interface NotificationPreferences {
  email_notifications_enabled: boolean
  welcome_email: boolean
  inactivity_reminders: boolean
  spaced_repetition_reminders: boolean
  milestone_celebrations: boolean
  marketing_emails: boolean
  timezone?: string
  preferred_hours?: number[]
}

export interface ProfileQuota {
  id: string
  user_id: string
  sessions_used: number
  sessions_limit: number
  period_start: string
  period_end: string
  created_at: string
  updated_at: string
  // Free opens: after first use, get 10 free scenario opens before next usage is counted
  free_opens_remaining?: number
  last_session_start?: string // Track when last paid session started
}

export interface InterviewSession {
  id: string
  user_id: string
  started_at: string
  completed_at?: string
  difficulty: "easy" | "medium" | "hard"
  topic: string
  type?: string // scenario type: 'dsa', 'bugfix', etc.
  scenario_id?: string // scenario ID for reopening sessions
  performance_score?: number
  feedback?: string
  // Additional completion data
  final_code?: string
  language?: string
  test_results?: Array<any>
  tests_passed?: number
  tests_total?: number
  time_complexity?: string
  space_complexity?: string
  efficiency_score?: number
  // Session state (for recovery)
  session_state?: {
    code?: string
    language?: string
    elapsed_time?: number
    test_results?: Array<any>
  }
}

export interface ErrorState {
  message: string
  code?: string
  details?: string
}

/**
 * Payment history record for subscription and one-time payments
 */
export interface PaymentHistory {
  id: string
  user_id: string
  type: "subscription" | "one_time"
  amount: number // Amount in cents
  currency: string
  status: "succeeded" | "failed" | "refunded"
  stripe_payment_intent_id?: string
  stripe_invoice_id?: string
  stripe_subscription_id?: string
  description?: string
  period_start?: string // ISO date string
  period_end?: string // ISO date string
  created_at: string
}

/**
 * User Learning State for Spaced Repetition
 * Tracks per-topic progress for email reminders
 */
export interface UserLearningState {
  user_id: string
  topics: {
    [topic_id: string]: TopicLearningState
  }
  last_session_at?: string
  streak_days: number
  created_at: string
  updated_at: string
}

export interface TopicLearningState {
  topic_name: string
  pattern?: string
  scenario_id?: string
  last_practiced_at: string
  performance_score: number
  review_count: number
  next_review_at: string
  interval_days: number
  ease_factor: number // SM-2 algorithm ease factor (default 2.5)
}

/**
 * Email Notification Record
 * Tracks sent emails for rate limiting and analytics
 */
export interface EmailNotificationRecord {
  id: string
  user_id: string
  email_type: "welcome" | "inactivity_24h" | "inactivity_48h" | "inactivity_72h" | "spaced_repetition" | "milestone"
  status: "pending" | "sent" | "failed" | "opened" | "clicked"
  scheduled_at: string
  sent_at?: string
  opened_at?: string
  clicked_at?: string
  metadata?: {
    topic?: string
    retention_estimate?: number
    last_session_id?: string
  }
  created_at: string
}

/**
 * Spaced Repetition Types
 */
export type SpacedRepetitionDifficulty = "easy" | "medium" | "hard"
export type SpacedRepetitionMasteryLevel = "new" | "learning" | "reviewing" | "mastered"
export type SpacedRepetitionPriority = "critical" | "high" | "medium" | "low"

/**
 * Problem-level mastery tracking for spaced repetition
 */
export interface ProblemMasteryRecord {
  problem_id: string
  scenario_id: string
  title: string
  pattern: string
  difficulty: SpacedRepetitionDifficulty

  // SM-2 State
  ease_factor: number
  interval_days: number
  review_count: number
  next_review_at: string

  // Performance History
  last_score: number
  average_score: number
  best_score: number
  scores_history: number[]

  // Metadata
  first_seen_at: string
  last_reviewed_at: string
  time_spent_minutes: number
  hints_used_total: number

  // Mastery
  mastery_level: SpacedRepetitionMasteryLevel
  confidence: number
}

/**
 * Due item for review queue
 */
export interface DueReviewItem {
  problem_id: string
  scenario_id: string
  title: string
  pattern: string
  difficulty: SpacedRepetitionDifficulty
  last_score: number
  days_overdue: number
  priority: SpacedRepetitionPriority
  priority_score: number
  estimated_minutes: number
  mastery_level: SpacedRepetitionMasteryLevel
  retention_estimate: number
}

/**
 * Smart recommendation from RAG system
 */
export interface SmartPracticeRecommendation {
  type: "review" | "practice_weakness" | "similar_to_failed" | "company_relevant" | "next_in_roadmap" | "strengthen_pattern"
  scenario_id: string
  title: string
  pattern: string
  difficulty: SpacedRepetitionDifficulty
  reason: string
  priority: number
  estimated_minutes: number
  companies?: string[]
}

/**
 * User mastery statistics
 */
export interface UserMasteryStatistics {
  overall: {
    total_problems_seen: number
    problems_mastered: number
    problems_reviewing: number
    problems_learning: number
    problems_new: number
    mastery_percentage: number
    streak_days: number
    longest_streak_days: number
    total_reviews: number
    average_score: number
    total_time_minutes: number
  }
  by_pattern: {
    pattern: string
    total: number
    mastered: number
    average_score: number
    mastery_percentage: number
  }[]
  by_difficulty: {
    difficulty: SpacedRepetitionDifficulty
    total: number
    mastered: number
    average_score: number
  }[]
  trends: {
    last_7_days: {
      reviews: number
      average_score: number
      new_mastered: number
    }
    last_30_days: {
      reviews: number
      average_score: number
      new_mastered: number
    }
  }
}

/**
 * ============================================
 * ALGORITHM A/B TESTING RESEARCH TYPES
 * ============================================
 * Comprehensive research infrastructure for comparing
 * SM-2 vs FSRS spaced repetition algorithms
 */

export type SpacedRepetitionAlgorithm = 'sm2' | 'fsrs'

/**
 * Daily snapshot of user's algorithm performance metrics
 * Stored in: algorithm_research_metrics/{userId}/daily/{YYYY-MM-DD}
 */
export interface AlgorithmDailyMetrics {
  user_id: string
  algorithm: SpacedRepetitionAlgorithm
  date: string // YYYY-MM-DD

  // Review Activity
  reviews_completed: number
  reviews_skipped: number
  total_review_time_minutes: number
  average_review_time_minutes: number

  // Performance Metrics
  scores: number[]                    // All scores from this day
  average_score: number
  median_score: number
  lowest_score: number
  highest_score: number

  // Quality Distribution (SM-2 quality ratings 0-5 or FSRS ratings 1-4)
  quality_distribution: Record<number, number>  // quality -> count

  // Retention & Memory
  retention_rate: number              // % of items recalled correctly (score >= 56)
  lapse_count: number                 // Times user forgot (score < 40)
  first_try_success_rate: number      // % correct on first attempt

  // Progress Metrics
  problems_due_at_start: number
  problems_completed: number
  new_problems_learned: number
  problems_mastered_today: number     // Moved to 'mastered' level
  problems_regressed_today: number    // Dropped mastery level

  // Streak & Engagement
  streak_days: number
  session_count: number               // How many practice sessions
  longest_session_minutes: number

  // Interval Analysis (key for comparing algorithms)
  intervals_scheduled: number[]       // Intervals assigned today
  average_interval_days: number
  max_interval_days: number

  // Hints & Difficulty
  hints_used: number
  problems_by_difficulty: {
    easy: { attempted: number; avg_score: number }
    medium: { attempted: number; avg_score: number }
    hard: { attempted: number; avg_score: number }
  }

  created_at: string
  updated_at: string
}

/**
 * User's cumulative algorithm research profile
 * Stored in: algorithm_research_metrics/{userId}/summary
 */
export interface AlgorithmResearchSummary {
  user_id: string
  algorithm: SpacedRepetitionAlgorithm
  algorithm_assigned_at: string
  algorithm_user_overridden: boolean

  // Lifetime Stats
  total_reviews: number
  total_problems_seen: number
  total_time_spent_minutes: number
  total_days_active: number

  // Performance Over Time
  lifetime_average_score: number
  lifetime_retention_rate: number
  lifetime_lapse_rate: number

  // Mastery Progress
  problems_mastered: number
  problems_learning: number
  problems_struggling: number         // Low ease factor, many lapses
  average_time_to_mastery_days: number

  // Engagement
  longest_streak: number
  current_streak: number
  average_daily_reviews: number
  average_session_length_minutes: number

  // Performance Trajectory (for trend analysis)
  weekly_averages: {
    week_start: string  // ISO date
    average_score: number
    retention_rate: number
    reviews_completed: number
    problems_mastered: number
  }[]

  // Interval Efficiency
  average_interval_accuracy: number   // How well predicted intervals matched actual retention
  interval_distribution: {
    '1-3_days': number
    '4-7_days': number
    '8-14_days': number
    '15-30_days': number
    '31-60_days': number
    '60+_days': number
  }

  // Algorithm-Specific Data
  sm2_specific?: {
    average_ease_factor: number
    ease_factor_distribution: Record<string, number>
  }
  fsrs_specific?: {
    average_stability: number
    average_difficulty: number
    desired_retention: number
  }

  first_review_at: string
  last_review_at: string
  created_at: string
  updated_at: string
}

/**
 * Aggregate comparison between algorithms
 * Stored in: algorithm_research_aggregate/comparison
 */
export interface AlgorithmComparisonAggregate {
  last_updated: string
  data_range: {
    start_date: string
    end_date: string
  }

  sm2: AlgorithmCohortStats
  fsrs: AlgorithmCohortStats

  // Statistical Analysis
  comparison: {
    retention_rate_difference: number      // FSRS - SM2 (positive = FSRS better)
    average_score_difference: number
    time_to_mastery_difference_days: number
    engagement_difference: number          // Average daily reviews difference
    interval_efficiency_difference: number

    // Significance Testing
    retention_p_value?: number
    score_p_value?: number
    sufficient_sample_size: boolean

    // Winner determination
    overall_winner?: SpacedRepetitionAlgorithm
    confidence_level?: number  // 0-100%
  }
}

/**
 * Stats for one algorithm cohort
 */
export interface AlgorithmCohortStats {
  algorithm: SpacedRepetitionAlgorithm

  // User Counts
  total_users: number
  active_users_7d: number              // Active in last 7 days
  active_users_30d: number
  users_with_overrides: number         // Excluded from research

  // Aggregate Performance
  average_retention_rate: number
  median_retention_rate: number
  average_score: number
  median_score: number

  // Mastery Stats
  total_problems_mastered: number
  average_problems_mastered_per_user: number
  average_time_to_mastery_days: number

  // Engagement Stats
  average_streak_days: number
  average_daily_reviews: number
  average_session_length_minutes: number
  churn_rate_7d: number                // % users inactive for 7+ days
  churn_rate_30d: number

  // Performance Distribution
  score_distribution: {
    '0-20': number
    '21-40': number
    '41-60': number
    '61-80': number
    '81-100': number
  }

  // Lapse Analysis
  average_lapse_rate: number
  users_with_zero_lapses: number

  // Interval Analysis
  average_interval_days: number
  interval_accuracy: number            // How well intervals predict actual retention

  // Trends (weekly for last 12 weeks)
  weekly_trends: {
    week: string
    active_users: number
    average_score: number
    retention_rate: number
    problems_mastered: number
  }[]
}

/**
 * Individual review event for granular analysis
 * Stored in: algorithm_research_events/{eventId}
 */
export interface AlgorithmResearchEvent {
  id: string
  user_id: string
  algorithm: SpacedRepetitionAlgorithm
  timestamp: string

  // Problem Context
  problem_id: string
  scenario_id: string
  pattern: string
  difficulty: SpacedRepetitionDifficulty

  // Performance
  score: number
  quality_rating: number               // SM-2: 0-5, FSRS: 1-4
  time_spent_minutes: number
  hints_used: number

  // Pre-review State
  pre_review: {
    interval_days: number
    days_since_last_review: number
    days_overdue: number
    ease_factor?: number               // SM-2
    stability?: number                 // FSRS
    predicted_retention: number
  }

  // Post-review State
  post_review: {
    new_interval_days: number
    new_ease_factor?: number           // SM-2
    new_stability?: number             // FSRS
    mastery_level: SpacedRepetitionMasteryLevel
    mastery_level_changed: boolean
  }

  // Retention Analysis
  actual_retention: boolean            // Did user remember? (score >= 56)
  retention_as_predicted: boolean      // Did prediction match reality?

  // Context
  session_number: number               // Which review in this session
  is_early_review: boolean
  is_first_review: boolean
}
