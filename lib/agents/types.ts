/**
 * Agent Types - Core interfaces for multi-agent architecture
 *
 * Philosophy:
 * - Each agent has a single responsibility
 * - Agents communicate through well-defined interfaces
 * - Orchestrator coordinates agent interactions
 * - Separation enables testing, cost optimization, and maintainability
 */

// =============================================================================
// AGENT IDENTIFICATION
// =============================================================================

export type AgentType =
  | "interviewer"      // Conducts the interview (smart model)
  | "state_tracker"    // Tracks conversation state (cheap model)
  | "response_validator" // Validates responses (deterministic)
  | "scorer"           // Calculates scores (deterministic)
  | "feedback_writer"  // Generates feedback (smart model)
  | "constitutional"   // Validates fairness (cheap model)

export type ModelTier = "smart" | "cheap" | "deterministic"

export interface AgentConfig {
  type: AgentType
  modelTier: ModelTier
  description: string
  // Cost tracking
  estimatedTokensPerCall?: number
  maxRetries?: number
}

// =============================================================================
// SHARED CONTEXT (passed between agents)
// =============================================================================

export interface InterviewContext {
  // Session info
  sessionId: string
  problemId: string
  problemTitle: string
  problemDifficulty: "easy" | "medium" | "hard"

  // Code state
  currentCode: string
  starterCode: string
  language: string

  // Test results (if run)
  testsHaveRun: boolean
  testResults?: TestResult[]
  testsPassed?: number
  testsTotal?: number

  // Solution analysis
  optimalTimeComplexity?: string
  optimalSpaceComplexity?: string
  isOptimalSolution?: boolean

  // User state
  hasSubmitted: boolean
  userId?: string

  // Rich context (built by context-builders.ts)
  // This is injected into the system prompt for full v1 parity
  promptContext?: {
    userContext: string
    companyContext: string
    patternContext: string
    edgeCaseContext: string
    testResultsContext: string
    complexityContext: string
    typeSpecificContext: string
    fuzzyModeContext: string
    levelContext: string
    knowledgeContext: string
    codeContext: string // Current solution code
    aiPartnerContext: string // AI Partner usage tracking
    userAnsweredContext: string // Topics already answered
    workspaceContext: string // Other files in user's codebase
    ragContext: string // RAG-enhanced dynamic context
  }
}

export interface TestResult {
  name: string
  passed: boolean
  input?: string
  expected?: string
  actual?: string
}

export interface ConversationState {
  // Phase detection
  currentPhase: InterviewPhase
  messageCount: number

  // What has been discussed
  approachExplained: boolean
  approachType: "none" | "brute_force" | "optimized" | "unclear"
  approachQuality: "none" | "vague" | "specific" | "detailed"

  // Complexity discussion
  timeComplexityMentioned: boolean
  timeComplexityValue: string | null
  spaceComplexityMentioned: boolean
  spaceComplexityValue: string | null
  complexityExplanationGiven: boolean

  // Edge cases
  edgeCasesMentioned: string[]
  edgeCasesAskedByInterviewer: string[]

  // Progress tracking
  hasStartedCoding: boolean
  hasRunTests: boolean
  hintsGiven: number

  // Positive signals
  clarifyingQuestionsAsked: boolean
  answeredInterviewerQuestions: number
  selfCorrectedBugs: boolean
}

export type InterviewPhase =
  | "intro"
  | "discussion"
  | "coding"
  | "testing"
  | "post_interview"
  | "complete"

// =============================================================================
// AGENT INPUT/OUTPUT TYPES
// =============================================================================

// Interviewer Agent
export interface InterviewerInput {
  context: InterviewContext
  state: ConversationState
  messages: ChatMessage[]
  lastUserMessage: string
  toolResults?: string // Pre-executed tool results
}

export interface InterviewerOutput {
  response: string
  suggestedPhase?: InterviewPhase
  confidence?: number
}

// State Tracker Agent
export interface StateTrackerInput {
  messages: ChatMessage[]
  currentState: Partial<ConversationState>
  context: InterviewContext
}

export interface StateTrackerOutput {
  state: ConversationState
  changes: string[] // What changed from previous state
}

// Response Validator
export interface ValidatorInput {
  response: string
  state: ConversationState
  context: InterviewContext
  lastUserMessage?: string
}

export interface ValidatorOutput {
  isValid: boolean
  violations: ValidationViolation[]
  shouldRegenerate: boolean
  regenerationHint?: string
}

export interface ValidationViolation {
  rule: string
  severity: "critical" | "warning"
  evidence: string
  hint: string
}

// =============================================================================
// FUTURE: Scoring & Feedback Agents (Phase 2 - post-submission)
// These types are defined for future implementation of:
// - ScorerAgent: Calculate scores from evidence
// - FeedbackWriterAgent: Generate detailed feedback
// - ConstitutionalAgent: Review feedback for accuracy
// =============================================================================

// Scorer Agent (PLANNED)
export interface ScorerInput {
  context: InterviewContext
  state: ConversationState
  messages: ChatMessage[]
  metrics: InteractionMetrics
}

export interface ScorerOutput {
  performanceScore: number
  technicalScore: number
  masteryScore: number
  breakdown: {
    understanding: number
    problemSolving: number
    codeQuality: number
    communication: number
  }
}

export interface InteractionMetrics {
  timeSpentSeconds: number
  hintsUsed: number
  hintsTotal: number
  testCasesPassed: number
  testCasesTotal: number
  codeExecutions: number
  debuggingAttempts: number
}

// Feedback Writer Agent
export interface FeedbackWriterInput {
  context: InterviewContext
  state: ConversationState
  scores: ScorerOutput
  messages: ChatMessage[]
  evidence: ExtractedEvidence
}

export interface FeedbackWriterOutput {
  summary: string
  strengths: string[]
  weaknesses: string[]
  improvements: string[]
  detailedFeedback: {
    understanding: string
    problemSolving: string
    codeQuality: string
    communication: string
  }
}

export interface ExtractedEvidence {
  approachQuote: string | null
  complexityQuote: string | null
  edgeCasesQuotes: string[]
  bugFixQuotes: string[]
  communicationQuotes: string[]
  questionsAnswered: number
  questionsTotal: number
}

// Constitutional AI Validator
export interface ConstitutionalInput {
  feedback: FeedbackWriterOutput
  scores: ScorerOutput
  evidence: ExtractedEvidence
  state: ConversationState
}

export interface ConstitutionalOutput {
  isValid: boolean
  corrections: FeedbackCorrection[]
  adjustedScores?: Partial<ScorerOutput["breakdown"]>
  reason?: string
}

export interface FeedbackCorrection {
  field: string
  original: string
  corrected: string
  reason: string
}

// =============================================================================
// CHAT MESSAGE TYPE
// =============================================================================

export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
  timestamp?: number
  metadata?: {
    phase?: InterviewPhase
    isCodeSubmission?: boolean
    isTestResult?: boolean
  }
}

// =============================================================================
// AGENT INTERFACE
// =============================================================================

export interface Agent<TInput, TOutput> {
  readonly config: AgentConfig

  /**
   * Execute the agent with given input
   */
  execute(input: TInput): Promise<TOutput>

  /**
   * Validate input before execution (optional)
   */
  validateInput?(input: TInput): { valid: boolean; error?: string }
}

// =============================================================================
// ORCHESTRATOR TYPES
// =============================================================================

export interface OrchestratorConfig {
  maxInterviewerRetries: number
  enableConstitutionalAI: boolean
  enableStateTracking: boolean
  logLevel: "debug" | "info" | "warn" | "error"
}

export interface OrchestrationResult<T> {
  success: boolean
  data?: T
  error?: string
  metrics?: {
    totalLatencyMs: number
    agentCalls: { agent: AgentType; latencyMs: number; tokens?: number }[]
    retries: number
  }
}
