import { z } from "zod"

export const MAX_FEEDBACK_CODE_LENGTH = 100000
export const MAX_FEEDBACK_TRANSCRIPT_LENGTH = 200000

export const feedbackRequestSchema = z
  .object({
    code: z.string().optional(),
    scenarioTitle: z.string().optional(),
    scenarioType: z.string().optional(),
    scenarioId: z.string().optional(),
    scenarioDifficulty: z.string().optional(),
    scenarioPattern: z.string().optional(),
    testResults: z.array(z.record(z.unknown())).optional(),
    language: z.string().optional(),
    timeSpent: z.number().optional(),
    aiCollaborationMetrics: z.record(z.unknown()).optional(),
    interactionMetrics: z.record(z.unknown()).optional(),
    efficiencyMetrics: z.record(z.unknown()).optional(),
    conversationTranscript: z.union([z.string(), z.array(z.record(z.unknown()))]).optional(),
    partnerMessages: z.array(z.record(z.unknown())).optional(),
    phaseTracking: z.record(z.unknown()).optional(),
    sessionId: z.string().optional(),
    userId: z.string().optional(),
    silentNotes: z.unknown().optional(),
    scenarioClarifyingQuestions: z.unknown().optional(),
    realInterviewMode: z.boolean().optional(),
  })
  .passthrough()

export interface FeedbackTranscriptMessage {
  type?: string
  role: string
  message?: string
  content: string
}

export interface FeedbackTestResult {
  description?: string
  passed?: boolean
  expected?: unknown
  actual?: unknown
  error?: string | null
}

export interface FeedbackEfficiencyMetrics {
  linesOfCode?: number | string
  complexity?: string
  estimatedTimeComplexity?: string
  optimalTimeComplexity?: string
  estimatedSpaceComplexity?: string
  optimalSpaceComplexity?: string
  efficiencyScore?: number
  problemPattern?: string
  difficulty?: string
}

export interface FeedbackPhaseTracking {
  submittedFromPhase?: string
  testsRanBeforeSubmit?: boolean
  conversationTracker?: {
    approachExplained?: boolean
    hintsGiven?: number
  }
}

export interface FeedbackSilentNote {
  type: string
  userSaid: string
  correct?: string
  context?: string
}

export interface FeedbackRequestBody {
  code: string
  scenarioTitle: string
  scenarioType?: string
  scenarioId?: string
  scenarioDifficulty?: string
  scenarioPattern?: string
  testResults?: FeedbackTestResult[]
  language?: string
  timeSpent?: number
  aiCollaborationMetrics?: {
    partnerMessagesSent?: number
  }
  interactionMetrics?: {
    interviewerQuestionsAnswered?: number
    hintsUsed?: number
  }
  efficiencyMetrics?: FeedbackEfficiencyMetrics
  conversationTranscript?: FeedbackTranscriptMessage[]
  partnerMessages?: FeedbackTranscriptMessage[]
  phaseTracking?: FeedbackPhaseTracking
  sessionId?: string
  userId?: string
  silentNotes?: FeedbackSilentNote[]
  scenarioClarifyingQuestions?: unknown
  realInterviewMode?: boolean
  [key: string]: unknown
}

export type FeedbackRequestValidationResult =
  | {
      success: true
      data: FeedbackRequestBody
    }
  | {
      success: false
      error: string
      status: 400
      logContext?: Record<string, unknown>
    }

export function validateFeedbackRequestBody(rawBody: unknown): FeedbackRequestValidationResult {
  const parseResult = feedbackRequestSchema.safeParse(rawBody)

  if (!parseResult.success) {
    return {
      success: false,
      error: "Invalid request body",
      status: 400,
      logContext: {
        errors: parseResult.error.errors.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    }
  }

  const data = parseResult.data

  if (!data.code || !data.scenarioTitle) {
    return {
      success: false,
      error: "Code and scenario title are required",
      status: 400,
    }
  }

  if (data.code.length > MAX_FEEDBACK_CODE_LENGTH) {
    return {
      success: false,
      error: `Code exceeds maximum length of ${MAX_FEEDBACK_CODE_LENGTH} characters`,
      status: 400,
      logContext: { codeLength: data.code.length },
    }
  }

  if (
    typeof data.conversationTranscript === "string" &&
    data.conversationTranscript.length > MAX_FEEDBACK_TRANSCRIPT_LENGTH
  ) {
    return {
      success: false,
      error: "Conversation transcript exceeds maximum length",
      status: 400,
      logContext: { transcriptLength: data.conversationTranscript.length },
    }
  }

  const normalizedData = {
    ...data,
    conversationTranscript: Array.isArray(data.conversationTranscript)
      ? data.conversationTranscript.map((message) => ({
          ...message,
          role:
            message.role ||
            (message.type === "user" || message.type === "candidate" ? "user" : "interviewer"),
          content: message.content || message.message || "",
        }))
      : undefined,
    partnerMessages: Array.isArray(data.partnerMessages)
      ? data.partnerMessages.map((message) => ({
          ...message,
          role: String(message.role || "assistant"),
          content: String(message.content || message.message || ""),
        }))
      : undefined,
  }

  return {
    success: true,
    data: normalizedData as FeedbackRequestBody,
  }
}
