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
  created_at: string
  updated_at: string
  // Onboarding fields (minimal MVP)
  role?: "student" | "junior" | "mid" | "senior"
  goal?: "faang" | "startup" | "general" | "promotion"
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
