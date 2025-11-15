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
  stripe_customer_id?: string
  stripe_subscription_id?: string
  subscription_start_date?: string // ISO date string when subscription started
  subscription_current_period_end?: string // ISO date string when current period ends
  created_at: string
  updated_at: string
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
