/**
 * Zod Validation Schemas for API Routes
 *
 * Centralized validation schemas for all API endpoints.
 * Import and use these to validate request bodies.
 */

import { z } from "zod"
import { NextResponse } from "next/server"
import { ALL_COMPANIES } from "@/lib/data/company-questions"
import type { CompanyId } from "@/lib/data/company-questions/types"
import { DSA_PATTERNS } from "@/lib/types/dsa-patterns"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import { VECTOR_CONTENT_TYPES, type VectorContentType } from "@/lib/rag/types"

// ============================================
// Common Schemas
// ============================================

export const UserIdSchema = z.string().min(1, "User ID is required")
export const SessionIdSchema = z.string().min(1, "Session ID is required")
export const EmailSchema = z.string().email("Invalid email format")

export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
})

// ============================================
// Chat API Schemas
// ============================================

export const ChatMessageSchema = z.object({
  message: z.string().max(10000, "Message too long").optional(),
  context: z
    .array(
      z.object({
        type: z.string(),
        message: z.string(),
      })
    )
    .optional(),
  role: z.enum(["interviewer", "partner"]).default("partner"),
  userContext: z
    .object({
      email: z.string().optional(),
      full_name: z.string().optional(),
      subscription_tier: z.string().optional(),
      sessions_used: z.number().optional(),
      previous_topics: z.array(z.string()).optional(),
      skill_level: z.string().optional(),
    })
    .optional(),
  workspaceContext: z
    .array(
      z.object({
        path: z.string(),
        content: z.string(),
      })
    )
    .optional(),
  currentCode: z.string().max(50000, "Code too long").optional(),
  isProactive: z.boolean().default(false),
  scenarioTitle: z.string().optional(),
  scenarioType: z.enum(["dsa", "system-design", "bugfix"]).optional(),
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
  code: z.string().min(1, "Code is required"),
  scenarioTitle: z.string().min(1, "Scenario title is required"),
  scenarioType: z.enum(["dsa", "system-design", "bugfix"]).optional(),
  scenarioId: z.string().optional(),
  scenarioDifficulty: z.enum(["easy", "medium", "hard"]).optional(),
  scenarioPattern: z.string().optional(),
  testResults: z.array(TestResultSchema).optional(),
  language: z.string().default("javascript"),
  timeSpent: z.number().optional(),
  aiCollaborationMetrics: z
    .object({
      partnerMessagesSent: z.number().optional(),
    })
    .optional(),
  interactionMetrics: z
    .object({
      interviewerQuestionsAnswered: z.number().optional(),
      hintsUsed: z.number().optional(),
    })
    .optional(),
  efficiencyMetrics: z
    .object({
      linesOfCode: z.number().optional(),
      complexity: z.string().optional(),
      estimatedTimeComplexity: z.string().optional(),
      optimalTimeComplexity: z.string().optional(),
      estimatedSpaceComplexity: z.string().optional(),
      optimalSpaceComplexity: z.string().optional(),
      efficiencyScore: z.number().optional(),
      problemPattern: z.string().optional(),
      difficulty: z.string().optional(),
    })
    .optional(),
  conversationTranscript: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
      })
    )
    .optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
})

// ============================================
// Guest Session Schemas
// ============================================

/**
 * PUT /api/guest-session update/completion body.
 *
 * SECURITY (API-3): performance/efficiency scores are bounded to 0-100 and the
 * code and test-result payloads are length-bounded, so a guest cannot write
 * arbitrary values through the Admin-SDK write path (ownership is still checked
 * separately via guestId + sessionId).
 *
 * Every field is OPTIONAL by design: guest resume writes `sessionState`, guest
 * completion writes the scores and results, and both rely on partial-field
 * merges, so we only validate fields that are actually present. Unknown keys on
 * a test result are preserved (passthrough) because the full result object,
 * including `input` and `error`, is stored and re-rendered on review.
 */
export const GuestSessionUpdateSchema = z.object({
  sessionId: z.string().min(1).optional(),
  guestId: z.string().min(1).optional(),
  sessionState: z
    .object({
      code: z.string().optional(),
      language: z.string().optional(),
      elapsedTime: z.number().optional(),
      chatMessages: z.array(z.unknown()).optional(),
      interviewerMessages: z.array(z.unknown()).optional(),
      testResults: z.array(z.unknown()).optional(),
    })
    .optional(),
  performanceScore: z.number().min(0, "Score must be 0-100").max(100, "Score must be 0-100").optional(),
  efficiencyScore: z.number().min(0, "Score must be 0-100").max(100, "Score must be 0-100").optional(),
  feedback: z.unknown().optional(),
  finalCode: z.string().max(50000, "Code too long").optional(),
  language: z.string().max(50).optional(),
  testResults: z.array(TestResultSchema.passthrough()).max(100, "Too many test results").optional(),
  timeComplexity: z.string().max(100).optional(),
  spaceComplexity: z.string().max(100).optional(),
})

// ============================================
// Promo Code Schemas
// ============================================

export const PromoCodeSchema = z.object({
  code: z
    .string()
    .min(3, "Promo code too short")
    .max(50, "Promo code too long")
    .regex(/^[A-Za-z0-9_-]+$/, "Invalid promo code format"),
})

// ============================================
// RAG API Schemas
// ============================================

const DSAPatternSchema = z.custom<DSAPattern>((value) => {
  return typeof value === "string" && Object.values(DSA_PATTERNS).includes(value as DSAPattern)
}, "Invalid DSA pattern")

const CompanyIdSchema = z.custom<CompanyId>((value) => {
  return typeof value === "string" && ALL_COMPANIES.some((company) => company.id === value)
}, "Invalid company")

const VectorContentTypeSchema = z.custom<VectorContentType>((value) => {
  return typeof value === "string" && VECTOR_CONTENT_TYPES.includes(value as VectorContentType)
}, "Invalid vector content type")

const RAGV2DifficultySchema = z.enum(["easy", "medium", "hard"])
const RAGV2KnowledgeCategorySchema = z.enum([
  "dsa-patterns",
  "company-knowledge",
  "interview-tips",
  "notification-knowledge",
  "debugging-knowledge",
  "system-design-knowledge",
])

const RAGV2TestResultsSchema = z.object({
  passed: z.number().int().min(0),
  total: z.number().int().min(0),
  failingTests: z.array(z.string().max(500)).max(20).optional(),
})

export const RAGV2ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("retrieve"),
    query: z.string().min(1, "Query is required").max(5000, "Query too long"),
    limit: z.number().int().min(1).max(50).optional(),
    minSimilarity: z.number().min(0).max(1).optional(),
    types: z.array(VectorContentTypeSchema).min(1).max(8).optional(),
    patterns: z.array(DSAPatternSchema).min(1).max(10).optional(),
    companies: z.array(CompanyIdSchema).min(1).max(10).optional(),
    difficulty: z.array(RAGV2DifficultySchema).min(1).max(3).optional(),
    enableQueryExpansion: z.boolean().optional(),
    enableReranking: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("build-context"),
    contextType: z.enum(["roadmap", "hint", "interview-prep", "feedback", "query"]),
    targetCompany: CompanyIdSchema.optional(),
    experienceLevel: z.enum(["intern", "beginner", "intermediate", "advanced"]).optional(),
    daysRemaining: z.number().int().min(1).max(365).optional(),
    patternFamiliarity: z
      .array(
        z.object({
          pattern: DSAPatternSchema,
          level: z.string().min(1).max(50),
        })
      )
      .max(50)
      .optional(),
    hoursPerDay: z.number().min(0.25).max(24).optional(),
    problemText: z.string().min(1).max(10000).optional(),
    problemPattern: DSAPatternSchema.optional(),
    userCode: z.string().max(50000).optional(),
    patterns: z.array(DSAPatternSchema).min(1).max(20).optional(),
    difficulty: z.enum(["easy", "medium", "hard", "mixed"]).optional(),
    testResults: z
      .object({ passed: z.number().int().min(0), total: z.number().int().min(0) })
      .optional(),
    query: z.string().min(1).max(5000).optional(),
  }),
  z.object({
    action: z.literal("get-pattern-knowledge"),
    pattern: DSAPatternSchema.optional(),
    patterns: z.array(DSAPatternSchema).min(1).max(20).optional(),
    format: z.enum(["full", "document", "summary"]).optional(),
  }),
  z.object({
    action: z.literal("get-company-knowledge"),
    company: CompanyIdSchema.optional(),
    companies: z.array(CompanyIdSchema).min(1).max(20).optional(),
    format: z.enum(["full", "document", "summary"]).optional(),
  }),
  z.object({ action: z.literal("get-user-performance") }),
  z.object({ action: z.literal("get-recommendations") }),
  z.object({ action: z.literal("get-enhanced-profile") }),
  z.object({
    action: z.literal("get-smart-recommendations"),
    targetCompany: CompanyIdSchema.optional(),
    availableMinutes: z.number().int().min(5).max(480).optional(),
    sessionGoal: z.enum(["warmup", "practice", "challenge", "review", "interview-prep"]).optional(),
    excludeIds: z.array(z.string().min(1).max(200)).max(100).optional(),
    limit: z.number().int().min(1).max(50).optional(),
    problems: z
      .array(
        z.object({
          id: z.string().min(1).max(200),
          title: z.string().min(1).max(300),
          pattern: DSAPatternSchema,
          difficulty: RAGV2DifficultySchema,
          company: CompanyIdSchema.optional(),
          frequency: z.number().min(0).max(100).optional(),
        })
      )
      .max(500)
      .optional(),
  }),
  z.object({ action: z.literal("get-skill-insights") }),
  z.object({
    action: z.literal("analyze-code"),
    code: z.string().min(1).max(50000),
    pattern: DSAPatternSchema,
    testResults: RAGV2TestResultsSchema.optional(),
  }),
  z.object({
    action: z.literal("generate-embedding"),
    text: z.string().min(1).max(10000).optional(),
    texts: z.array(z.string().min(1).max(10000)).min(1).max(20).optional(),
  }),
  z.object({
    action: z.literal("seed-knowledge-base"),
    force: z.boolean().optional(),
    categories: z.array(RAGV2KnowledgeCategorySchema).min(1).max(6).optional(),
  }),
  z.object({ action: z.literal("health") }),
])

// ============================================
// Checkout/Payment Schemas
// ============================================

export const CreateCheckoutSchema = z.object({
  email: z.string().email("Valid email required"),
  userId: z.string().min(1, "User ID is required"),
  platform: z.enum(["website", "vscode"]).default("website"),
  planType: z.enum(["monthly", "yearly"]).default("monthly"),
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
  skill_level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  target_company: z.string().max(100).optional(),
  weekly_goal: z.number().int().min(1).max(50).optional(),
  notification_preferences: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      weekly_digest: z.boolean().optional(),
    })
    .optional(),
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
  scenarioId: z.string().min(1, "Scenario ID is required"),
  quality: z.number().int().min(0).max(5, "Quality must be 0-5"),
  timeSpentMs: z.number().optional(),
})

export const SpacedRepetitionSkipSchema = z.object({
  scenarioId: z.string().min(1, "Scenario ID is required"),
  reason: z.enum(["too_easy", "too_hard", "not_interested", "no_time"]).optional(),
})

// ============================================
// Code Execution Schemas
// ============================================

export const ExecuteCodeSchema = z.object({
  code: z.string().min(1, "Code is required").max(50000, "Code too long"),
  language: z.enum(["javascript", "typescript", "python", "java", "cpp", "go", "rust"]),
  testCases: z
    .array(
      z.object({
        input: z.unknown(),
        expected: z.unknown(),
      })
    )
    .optional(),
  timeout: z.number().int().min(1000).max(30000).default(10000),
})

// ============================================
// Validation Helper
// ============================================

export type ValidationResult<T> = { success: true; data: T } | { success: false; error: z.ZodError }

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
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
  return NextResponse.json(
    {
      error: "Validation failed",
      details: error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    },
    { status: 400 }
  )
}
