/**
 * Application-wide constants
 *
 * Centralizes magic numbers and configuration values that were previously
 * scattered throughout the codebase. This improves maintainability and
 * makes it easier to adjust values across the application.
 */

// =============================================================================
// API & Rate Limiting
// =============================================================================

export const API_LIMITS = {
  /** Maximum messages to include in chat history */
  MAX_HISTORY_MESSAGES: 20,
  /** Maximum length of a single message in characters */
  MAX_MESSAGE_LENGTH: 4000,
  /** Maximum number of workspace files allowed */
  MAX_WORKSPACE_FILES: 5,
  /** Maximum file size in characters */
  MAX_FILE_SIZE: 10000,
} as const

// =============================================================================
// Timing & Delays
// =============================================================================

export const TIMING = {
  /** Standard debounce delay in milliseconds */
  DEBOUNCE_MS: 300,
  /** Toast notification display duration in milliseconds */
  TOAST_DURATION_MS: 3000,
  /** Loading state minimum display time to prevent flashing */
  MIN_LOADING_MS: 500,
  /** Animation delay for staggered effects */
  STAGGER_DELAY_MS: 100,
  /** Multi-tab heartbeat interval */
  HEARTBEAT_INTERVAL_MS: 2000,
  /** Threshold for considering a tab stale */
  STALE_THRESHOLD_MS: 5000,
} as const

// =============================================================================
// Cache TTLs
// =============================================================================

export const CACHE_TTL = {
  /** Gemini model cache TTL in milliseconds (1 hour) */
  GEMINI_MODEL_MS: 60 * 60 * 1000,
  /** Session cache TTL in milliseconds (5 minutes) */
  SESSION_MS: 5 * 60 * 1000,
  /** User profile cache TTL in milliseconds (10 minutes) */
  PROFILE_MS: 10 * 60 * 1000,
} as const

// =============================================================================
// Scoring Types & Interfaces
// =============================================================================

/**
 * Components for calculating performance score (full interview simulation)
 * Each component is scored 0-100
 */
export interface PerformanceScoreComponents {
  /** How well user understood and explained their approach (0-100) */
  understanding: number
  /** Problem solving approach and debugging skills (0-100) */
  problemSolving: number
  /** Code correctness, efficiency, and cleanliness (0-100) */
  codeQuality: number
  /** Communication skills - explaining thought process (0-100) */
  communication: number
}

/**
 * Components for calculating technical/mastery score (code-only metrics)
 * Each component is scored 0-100
 */
export interface TechnicalScoreComponents {
  /** Test pass rate (0-100) */
  correctness: number
  /** How quickly solved relative to expected time (0-100) */
  timeEfficiency: number
  /** Minimal hint usage (0-100) */
  independence: number
}

/**
 * Performance level categories for feedback
 */
export type PerformanceLevel = "excellent" | "good" | "developing" | "needs-work"

/**
 * Letter grade type derived from score thresholds
 */
export type LetterGrade = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F"

// =============================================================================
// Scoring & Thresholds
// =============================================================================

export const SCORING = {
  /** Score threshold for perfect performance */
  PERFECT_SCORE_THRESHOLD: 86,
  /** Maximum interval between reviews in days */
  MAX_INTERVAL_DAYS: 180,
  /** Minimum score for mastery level */
  MASTERY_THRESHOLD: 80,
  /** Good performance threshold */
  GOOD_THRESHOLD: 60,

  /**
   * PERFORMANCE SCORE WEIGHTS (Full interview simulation)
   * Used for: interview readiness, includes communication skills
   *
   * Philosophy: Real FAANG interviews heavily weight communication.
   * A silent optimal solution is a C at best - you must explain your thinking.
   */
  PERFORMANCE_WEIGHTS: {
    /** Understanding: Can you explain your approach? (LLM-evaluated) */
    UNDERSTANDING: 0.25,
    /** Problem Solving: Debug & optimize effectively */
    PROBLEM_SOLVING: 0.25,
    /** Code Quality: Clean, efficient, passes tests */
    CODE_QUALITY: 0.2,
    /** Communication: Think out loud, answer questions */
    COMMUNICATION: 0.3,
  },

  /**
   * TECHNICAL SCORE WEIGHTS (Code-only metrics, no communication)
   * Used for: spaced repetition, pattern mastery tracking
   *
   * This is the same as "mastery score" - they are unified.
   * Focuses purely on objective code metrics.
   */
  TECHNICAL_WEIGHTS: {
    /** Correctness: Test pass rate */
    CORRECTNESS: 0.6,
    /** Time Efficiency: Solve speed relative to expected time */
    TIME_EFFICIENCY: 0.25,
    /** Independence: Minimal hint usage */
    INDEPENDENCE: 0.15,
  },

  /**
   * SYSTEM DESIGN WEIGHTS (Discussion-based interview)
   * Communication is heavily weighted because system design is about
   * explaining architectural decisions and trade-offs.
   */
  SYSTEM_DESIGN_WEIGHTS: {
    /** Understanding: Requirements gathering */
    UNDERSTANDING: 0.2,
    /** Problem Solving: Architecture & scalability */
    PROBLEM_SOLVING: 0.3,
    /** Code Quality: Design depth */
    CODE_QUALITY: 0.2,
    /** Communication: Critical for system design */
    COMMUNICATION: 0.3,
  },

  /**
   * BUG FIX WEIGHTS (Debugging-focused interview)
   * Understanding is heavily weighted because finding and explaining
   * the root cause is the most important skill in debugging.
   */
  BUG_FIX_WEIGHTS: {
    /** Understanding: Finding + explaining the bug */
    UNDERSTANDING: 0.35,
    /** Problem Solving: Debugging approach */
    PROBLEM_SOLVING: 0.25,
    /** Code Quality: Clean fix */
    CODE_QUALITY: 0.2,
    /** Communication: Explaining process */
    COMMUNICATION: 0.2,
  },

  /**
   * Performance level thresholds (for feedback categorization)
   */
  PERFORMANCE_LEVELS: {
    EXCELLENT: 85,
    GOOD: 70,
    DEVELOPING: 50,
    // Below 50 = needs work
  },

  /**
   * Letter grade thresholds
   */
  LETTER_GRADES: {
    A_PLUS: 95,
    A: 90,
    A_MINUS: 85,
    B_PLUS: 80,
    B: 75,
    B_MINUS: 70,
    C_PLUS: 65,
    C: 60,
    C_MINUS: 55,
    D: 50,
    // Below 50 = F
  },
} as const

// =============================================================================
// Vector Dimensions (RAG)
// =============================================================================

export const VECTOR_DIMENSIONS = {
  /** Metrics vector dimension */
  METRICS: 25,
  /** Code features vector dimension */
  CODE_FEATURES: 15,
  /** Default embedding dimension */
  DEFAULT_EMBEDDING: 768,
} as const

// =============================================================================
// Retry Configuration
// =============================================================================

export const RETRY_CONFIG = {
  /** Maximum number of retry attempts */
  MAX_RETRIES: 3,
  /** Initial delay before first retry in milliseconds */
  INITIAL_DELAY_MS: 1000,
  /** Multiplier for exponential backoff */
  BACKOFF_MULTIPLIER: 2,
} as const

// =============================================================================
// Pagination
// =============================================================================

export const PAGINATION = {
  /** Default page size for list endpoints */
  DEFAULT_PAGE_SIZE: 20,
  /** Maximum page size allowed */
  MAX_PAGE_SIZE: 100,
} as const

// =============================================================================
// Session
// =============================================================================

export const SESSION = {
  /** Maximum session duration in hours */
  MAX_DURATION_HOURS: 4,
  /** Guest session expiry in days */
  GUEST_EXPIRY_DAYS: 7,
  /** Inactive session cleanup threshold in days */
  INACTIVE_CLEANUP_DAYS: 30,
} as const

// =============================================================================
// Voice Recording
// =============================================================================

export const VOICE = {
  /** Maximum recording duration in seconds (3 minutes) - prevents abuse */
  MAX_RECORDING_SECONDS: 180,
  /** Warning threshold before max duration (30 seconds before cutoff) */
  WARNING_THRESHOLD_SECONDS: 150,
} as const

// =============================================================================
// UI Constants
// =============================================================================

export const UI = {
  /** Maximum announcements to show */
  MAX_ANNOUNCEMENTS: 10,
  /** Maximum recent sessions to display */
  MAX_RECENT_SESSIONS: 5,
  /** Sidebar collapsed width in pixels */
  SIDEBAR_COLLAPSED_WIDTH: 64,
  /** Sidebar expanded width in pixels */
  SIDEBAR_EXPANDED_WIDTH: 256,
} as const

// =============================================================================
// Webhook & Security
// =============================================================================

export const WEBHOOK = {
  /** Maximum age of a webhook event in seconds before rejecting (replay protection) */
  MAX_EVENT_AGE_SECONDS: 300,
  /** TTL for processed event deduplication records in days */
  IDEMPOTENCY_TTL_DAYS: 30,
} as const

// =============================================================================
// Circuit Breaker
// =============================================================================

export const CIRCUIT_BREAKER = {
  /** Open circuit after this many consecutive failures */
  FAILURE_THRESHOLD: 5,
  /** Reset circuit after this duration of no failures (ms) */
  RESET_MS: 60 * 1000,
  /**
   * Max requests allowed per user when the circuit is open (Firestore outage).
   * NOTE: this counter is per warm serverless instance, so the effective
   * allowance is this value times the number of warm instances. Kept low so
   * the worst-case fail-open spend during an outage stays bounded; the
   * aggregate backstop is COST_PROTECTION.GLOBAL_DAILY_SPEND_CEILING_USD.
   */
  MAX_FAIL_OPEN_REQUESTS: 5,
} as const

// =============================================================================
// Cost Protection (aggregate AI spend guardrails)
// =============================================================================

export const COST_PROTECTION = {
  /**
   * Hard ceiling on total AI spend (USD) across ALL users in a single UTC day.
   * Acts as a global kill-switch backstop independent of per-user budgets so a
   * surge (or many free accounts) cannot run an unbounded bill. Override at
   * runtime with GLOBAL_DAILY_SPEND_CEILING_USD. Set to 0 to disable the gate.
   */
  // Re-set 2026-08-01: this counter is fed by calculateCost(), so while
  // PROVIDER_COSTS understated spend ~23x this $50 brake was really a ~$1,150
  // brake. Now that the rates are correct, $250 is a real ceiling covering
  // roughly 600 sessions/day, well above a 300-user launch.
  GLOBAL_DAILY_SPEND_CEILING_USD: 250,
} as const

// =============================================================================
// Scoring Utility Functions
// =============================================================================

/**
 * Get letter grade from numeric score (0-100)
 * Uses thresholds defined in SCORING.LETTER_GRADES
 */
export function getLetterGrade(score: number): LetterGrade {
  const { LETTER_GRADES } = SCORING
  if (score >= LETTER_GRADES.A_PLUS) return "A+"
  if (score >= LETTER_GRADES.A) return "A"
  if (score >= LETTER_GRADES.A_MINUS) return "A-"
  if (score >= LETTER_GRADES.B_PLUS) return "B+"
  if (score >= LETTER_GRADES.B) return "B"
  if (score >= LETTER_GRADES.B_MINUS) return "B-"
  if (score >= LETTER_GRADES.C_PLUS) return "C+"
  if (score >= LETTER_GRADES.C) return "C"
  if (score >= LETTER_GRADES.C_MINUS) return "C-"
  if (score >= LETTER_GRADES.D) return "D"
  return "F"
}

/**
 * Tailwind text-color class per letter grade. One owner so the practice score surfaces
 * (ScoreDisplay, PracticeFeedback) render the exact same grade colors.
 */
export const GRADE_COLOR_CLASS: Record<LetterGrade, string> = {
  "A+": "text-emerald-400",
  A: "text-emerald-400",
  "A-": "text-emerald-400",
  "B+": "text-sky-400",
  B: "text-sky-400",
  "B-": "text-sky-400",
  "C+": "text-amber-400",
  C: "text-amber-400",
  "C-": "text-amber-400",
  D: "text-orange-400",
  F: "text-red-400",
}

/**
 * Get performance level from numeric score (0-100)
 * Uses thresholds defined in SCORING.PERFORMANCE_LEVELS
 */
export function getPerformanceLevel(score: number): PerformanceLevel {
  const { PERFORMANCE_LEVELS } = SCORING
  if (score >= PERFORMANCE_LEVELS.EXCELLENT) return "excellent"
  if (score >= PERFORMANCE_LEVELS.GOOD) return "good"
  if (score >= PERFORMANCE_LEVELS.DEVELOPING) return "developing"
  return "needs-work"
}

/**
 * Clamp a score to valid bounds (0-100)
 * Ensures all scores are within the expected range.
 * Non-finite input (NaN/Infinity from bad request bodies or failed parses)
 * falls back to 0 instead of propagating through averages and serialization.
 */
export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.min(100, Math.max(0, Math.round(score)))
}

/**
 * Calculate weighted performance score from components
 * Uses weights from SCORING.PERFORMANCE_WEIGHTS
 *
 * Input scores are clamped to 0-100 range for safety.
 * Output is also bounded to 0-100.
 */
export function calculatePerformanceScore(components: PerformanceScoreComponents): number {
  const w = SCORING.PERFORMANCE_WEIGHTS
  // Clamp inputs to valid range
  const u = clampScore(components.understanding)
  const ps = clampScore(components.problemSolving)
  const cq = clampScore(components.codeQuality)
  const c = clampScore(components.communication)

  const score =
    u * w.UNDERSTANDING + ps * w.PROBLEM_SOLVING + cq * w.CODE_QUALITY + c * w.COMMUNICATION

  return clampScore(score)
}

/**
 * Scenario-aware variant of calculatePerformanceScore. System design and bug
 * fix interviews weight the four components differently (SYSTEM_DESIGN_WEIGHTS
 * / BUG_FIX_WEIGHTS); recomputing an overall with DSA weights for those
 * scenario types silently shifts user-facing scores. Any code that recomputes
 * an overall for an arbitrary session must use this, not the DSA-only default.
 */
export function calculatePerformanceScoreForScenario(
  components: PerformanceScoreComponents,
  scenarioType: string | undefined
): number {
  const w =
    scenarioType === "system-design" || scenarioType === "system_design"
      ? SCORING.SYSTEM_DESIGN_WEIGHTS
      : scenarioType === "bugfix" || scenarioType === "bug_fix" || scenarioType === "bug-fix"
        ? SCORING.BUG_FIX_WEIGHTS
        : SCORING.PERFORMANCE_WEIGHTS

  const u = clampScore(components.understanding)
  const ps = clampScore(components.problemSolving)
  const cq = clampScore(components.codeQuality)
  const c = clampScore(components.communication)

  const score =
    u * w.UNDERSTANDING + ps * w.PROBLEM_SOLVING + cq * w.CODE_QUALITY + c * w.COMMUNICATION

  return clampScore(score)
}

/**
 * Calculate weighted technical/mastery score from components
 * Uses weights from SCORING.TECHNICAL_WEIGHTS
 *
 * NOTE: Technical score and mastery score are the same thing.
 * Both measure objective code metrics without communication.
 *
 * Input scores are clamped to 0-100 range for safety.
 * Output is also bounded to 0-100.
 */
export function calculateTechnicalScore(components: TechnicalScoreComponents): number {
  const w = SCORING.TECHNICAL_WEIGHTS
  // Clamp inputs to valid range
  const cor = clampScore(components.correctness)
  const te = clampScore(components.timeEfficiency)
  const ind = clampScore(components.independence)

  const score = cor * w.CORRECTNESS + te * w.TIME_EFFICIENCY + ind * w.INDEPENDENCE

  return clampScore(score)
}

/**
 * Calculate technical/mastery score from score breakdown (legacy format)
 * This is the READ-TIME fallback for legacy documents that predate the Technical = Mastery
 * unification: when a persisted technical_score is absent, derive one from the AI-evaluated
 * breakdown. New writes persist the mastery score directly (app/api/feedback/persist), so this
 * formula must not be used on the live write path.
 *
 * Uses a different weight distribution since breakdown scores are different metrics:
 * - Code Quality: 60% (closest proxy for correctness)
 * - Problem Solving: 25% (approach quality)
 * - Understanding: 15% (comprehension)
 *
 * @deprecated Prefer calculateTechnicalScore with objective metrics when available
 */
export function calculateTechnicalScoreFromBreakdown(breakdown: {
  codeQualityScore: number
  problemSolvingScore: number
  understandingScore: number
}): number {
  // Clamp inputs to valid range
  const cq = clampScore(breakdown.codeQualityScore)
  const ps = clampScore(breakdown.problemSolvingScore)
  const u = clampScore(breakdown.understandingScore)

  // Use hardcoded weights for legacy breakdown calculation
  // These weights differ from TECHNICAL_WEIGHTS because breakdown scores
  // are AI-evaluated subjective metrics, not objective metrics
  const LEGACY_WEIGHTS = {
    CODE_QUALITY: 0.6,
    PROBLEM_SOLVING: 0.25,
    UNDERSTANDING: 0.15,
  }

  const score =
    cq * LEGACY_WEIGHTS.CODE_QUALITY +
    ps * LEGACY_WEIGHTS.PROBLEM_SOLVING +
    u * LEGACY_WEIGHTS.UNDERSTANDING

  return clampScore(score)
}
