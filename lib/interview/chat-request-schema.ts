import { z } from "zod"

// Schema validation for chat API request body.
// Uses passthrough() to allow additional fields while validating known fields.
export const chatRequestSchema = z
  .object({
    message: z.string().max(10000).optional(),
    context: z
      .array(
        z.object({
          type: z.string(),
          message: z.string(),
        })
      )
      .optional(),
    role: z.enum(["interviewer", "partner"]).optional(),
    userContext: z.record(z.unknown()).optional(),
    workspaceContext: z
      .array(
        z.object({
          path: z.string(),
          content: z.string(),
          role: z.string().optional(),
          description: z.string().optional(),
          hidden: z.boolean().optional(),
          active: z.boolean().optional(),
          edited: z.boolean().optional(),
        })
      )
      .optional(),
    currentCode: z.string().max(100000).optional(),
    isProactive: z.boolean().optional(),
    scenarioTitle: z.string().optional(),
    scenarioType: z.string().optional(),
    scenarioPattern: z.string().optional(),
    scenarioCompany: z.string().nullish(),
    elapsedTime: z.number().optional(),
    sessionId: z.string().optional(),
    userId: z.string().optional(),
    partnerMessagesCount: z.number().optional(),
    lastPartnerExchange: z.string().optional(),
    recentNudgeTopics: z.array(z.string()).optional(),
    userAnsweredTopics: z.array(z.string()).optional(),
    timeSinceLastMessage: z.number().optional(),
    isWrapUp: z.boolean().optional(),
    edgeCases: z.array(z.record(z.unknown())).optional(),
    testResults: z.array(z.record(z.unknown())).optional(),
    consoleLogs: z.array(z.record(z.unknown())).optional(),
    interviewPhase: z.string().optional(),
    conversationTracker: z.record(z.unknown()).optional(),
    hasSubmitted: z.boolean().optional(),
    solutionComplexity: z.record(z.unknown()).nullish(),
    realInterviewMode: z.boolean().optional(),
    hasFuzzyStatement: z.boolean().optional(),
    scenarioClarifyingQuestions: z.unknown().optional(),
    scenarioFuzzyStatement: z.string().optional(),
    starterCodeLength: z.number().optional(),
  })
  .passthrough()

export interface UserContext {
  email?: string
  full_name?: string
  subscription_tier?: string
  sessions_used?: number
  previous_topics?: string[]
  skill_level?: string
}

export interface TestResultItem {
  description?: string
  passed?: boolean
  input?: unknown
  expected?: unknown
  actual?: unknown
  error?: string | null
}

export interface ConsoleLogItem {
  type?: string
  message?: string
}
