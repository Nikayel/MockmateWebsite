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
}

export interface ErrorState {
  message: string
  code?: string
  details?: string
}
