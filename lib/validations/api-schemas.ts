/**
 * Zod Validation Schemas for API Routes
 *
 * Centralized validation schemas for all API endpoints.
 * Import and use these to validate request bodies.
 */

import { z } from 'zod'

// ============================================
// Common Schemas
// ============================================

export const UserIdSchema = z.string().min(1, 'User ID is required')
export const SessionIdSchema = z.string().min(1, 'Session ID is required')
export const EmailSchema = z.string().email('Invalid email format')

export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
})

// ============================================
// Chat API Schemas
// ============================================

export const ChatMessageSchema = z.object({
  message: z.string().max(10000, 'Message too long').optional(),
  context: z.array(z.object({
    type: z.string(),
    message: z.string(),
  })).optional(),
  role: z.enum(['interviewer', 'partner']).default('partner'),
  userContext: z.object({
    email: z.string().optional(),
    full_name: z.string().optional(),
    subscription_tier: z.string().optional(),
    sessions_used: z.number().optional(),
    previous_topics: z.array(z.string()).optional(),
    skill_level: z.string().optional(),
  }).optional(),
  workspaceContext: z.array(z.object({
    path: z.string(),
    content: z.string(),
  })).optional(),
  currentCode: z.string().max(50000, 'Code too long').optional(),
  isProactive: z.boolean().default(false),
  scenarioTitle: z.string().optional(),
  scenarioType: z.enum(['dsa', 'system-design', 'bugfix']).optional(),
  scenarioPattern: z.string().optional(),
  scenarioCompany: z.string().optional(),
  elapsedTime: z.number().optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
})

// ============================================
// Feedback API Schemas
// ============================================

export const TestResultSchema = z.object({
  passed: z.boolean(),
  description: z.string().optional(),
  expected: z.unknown().optional(),
  actual: z.unknown().optional(),
})

export const GenerateFeedbackSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  scenarioTitle: z.string().min(1, 'Scenario title is required'),
  scenarioType: z.enum(['dsa', 'system-design', 'bugfix']).optional(),
  scenarioId: z.string().optional(),
  scenarioDifficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  scenarioPattern: z.string().optional(),
  testResults: z.array(TestResultSchema).optional(),
  language: z.string().default('javascript'),
  timeSpent: z.number().optional(),
  aiCollaborationMetrics: z.object({
    partnerMessagesSent: z.number().optional(),
  }).optional(),
  interactionMetrics: z.object({
    interviewerQuestionsAnswered: z.number().optional(),
    hintsUsed: z.number().optional(),
  }).optional(),
  efficiencyMetrics: z.object({
    linesOfCode: z.number().optional(),
    complexity: z.string().optional(),
    estimatedTimeComplexity: z.string().optional(),
    optimalTimeComplexity: z.string().optional(),
    estimatedSpaceComplexity: z.string().optional(),
    optimalSpaceComplexity: z.string().optional(),
    efficiencyScore: z.number().optional(),
    problemPattern: z.string().optional(),
    difficulty: z.string().optional(),
  }).optional(),
  conversationTranscript: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })).optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
})

// ============================================
// Promo Code Schemas
// ============================================

export const PromoCodeSchema = z.object({
  code: z.string()
    .min(3, 'Promo code too short')
    .max(50, 'Promo code too long')
    .regex(/^[A-Za-z0-9_-]+$/, 'Invalid promo code format'),
})

// ============================================
// RAG API Schemas
// ============================================

export const RAGActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('get-hints'),
    problemText: z.string().min(1, 'Problem text is required'),
    problemTitle: z.string().optional(),
    userCode: z.string().optional(),
    difficulty: z.string().optional(),
    problemType: z.string().optional(),
    problemPattern: z.string().optional(),
    userId: z.string().optional(),
    limit: z.number().int().min(1).max(20).default(3),
  }),
  z.object({
    action: z.literal('get-similar-problems'),
    problemText: z.string().min(1, 'Problem text is required'),
    problemId: z.string().optional(),
    difficulty: z.string().optional(),
    limit: z.number().int().min(1).max(20).default(5),
  }),
  z.object({
    action: z.literal('get-similar-solutions'),
    userId: z.string().min(1, 'User ID is required'),
    problemText: z.string().min(1, 'Problem text is required'),
    limit: z.number().int().min(1).max(20).default(5),
    problemType: z.string().optional(),
  }),
  z.object({
    action: z.literal('get-recommendations'),
    userId: z.string().min(1, 'User ID is required'),
    availableScenarios: z.array(z.object({
      id: z.string(),
      type: z.string(),
      difficulty: z.string(),
      title: z.string(),
    })),
  }),
  z.object({
    action: z.literal('store-solution'),
    userId: z.string().min(1, 'User ID is required'),
    problemId: z.string().min(1, 'Problem ID is required'),
    problemTitle: z.string().optional(),
    solutionCode: z.string(),
    language: z.string().default('javascript'),
    passed: z.boolean(),
    score: z.number().min(0).max(100),
    problemType: z.string().optional(),
  }),
  z.object({
    action: z.literal('get-learning-path'),
    userId: z.string().min(1, 'User ID is required'),
    targetSkills: z.array(z.string()).optional(),
  }),
  z.object({
    action: z.literal('get-next-problems'),
    userId: z.string().min(1, 'User ID is required'),
    currentProblemText: z.string().min(1, 'Problem text is required'),
    currentProblemId: z.string().optional(),
  }),
  z.object({
    action: z.literal('store-onboarding'),
    userId: z.string().min(1, 'User ID is required'),
    role: z.string().min(1, 'Role is required'),
    goal: z.string().min(1, 'Goal is required'),
  }),
])

// ============================================
// Checkout/Payment Schemas
// ============================================

export const CreateCheckoutSchema = z.object({
  email: z.string().email('Valid email required'),
  userId: z.string().min(1, 'User ID is required'),
  platform: z.enum(['website', 'vscode']).default('website'),
  planType: z.enum(['monthly', 'yearly']).default('monthly'),
  returnUrl: z.string().url().optional(),
})

export const CustomerPortalSchema = z.object({
  customerId: z.string().optional(),
  returnUrl: z.string().url().optional(),
})

// ============================================
// User Profile Schemas
// ============================================

export const UpdateProfileSchema = z.object({
  full_name: z.string().max(100).optional(),
  skill_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  target_company: z.string().max(100).optional(),
  weekly_goal: z.number().int().min(1).max(50).optional(),
  notification_preferences: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    weekly_digest: z.boolean().optional(),
  }).optional(),
})

// ============================================
// Notification Schemas
// ============================================

export const NotificationPreferencesSchema = z.object({
  email: z.boolean().default(true),
  push: z.boolean().default(true),
  weekly_digest: z.boolean().default(true),
  spaced_repetition: z.boolean().default(true),
})

// ============================================
// Spaced Repetition Schemas
// ============================================

export const SpacedRepetitionCompleteSchema = z.object({
  scenarioId: z.string().min(1, 'Scenario ID is required'),
  quality: z.number().int().min(0).max(5, 'Quality must be 0-5'),
  timeSpentMs: z.number().optional(),
})

export const SpacedRepetitionSkipSchema = z.object({
  scenarioId: z.string().min(1, 'Scenario ID is required'),
  reason: z.enum(['too_easy', 'too_hard', 'not_interested', 'no_time']).optional(),
})

// ============================================
// Code Execution Schemas
// ============================================

export const ExecuteCodeSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50000, 'Code too long'),
  language: z.enum(['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'rust']),
  testCases: z.array(z.object({
    input: z.unknown(),
    expected: z.unknown(),
  })).optional(),
  timeout: z.number().int().min(1000).max(30000).default(10000),
})

// ============================================
// Validation Helper
// ============================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: z.ZodError }

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

/**
 * Create a NextResponse for validation errors
 */
export function validationErrorResponse(error: z.ZodError) {
  const { NextResponse } = require('next/server')
  return NextResponse.json(
    {
      error: 'Validation failed',
      details: error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    },
    { status: 400 }
  )
}
