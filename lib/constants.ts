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
    CODE_QUALITY: 0.3,
    /** Communication: Think out loud, answer questions */
    COMMUNICATION: 0.2,
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
// Scoring Utility Functions
// =============================================================================

/**
 * Get letter grade from numeric score (0-100)
 * Uses thresholds defined in SCORING.LETTER_GRADES
 */
export function getLetterGrade(score: number): string {
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
 * Get performance level from numeric score (0-100)
 * Uses thresholds defined in SCORING.PERFORMANCE_LEVELS
 */
export function getPerformanceLevel(
  score: number
): "excellent" | "good" | "developing" | "needs-work" {
  const { PERFORMANCE_LEVELS } = SCORING
  if (score >= PERFORMANCE_LEVELS.EXCELLENT) return "excellent"
  if (score >= PERFORMANCE_LEVELS.GOOD) return "good"
  if (score >= PERFORMANCE_LEVELS.DEVELOPING) return "developing"
  return "needs-work"
}

/**
 * Calculate weighted performance score from components
 * Uses weights from SCORING.PERFORMANCE_WEIGHTS
 */
export function calculatePerformanceScore(components: {
  understanding: number
  problemSolving: number
  codeQuality: number
  communication: number
}): number {
  const w = SCORING.PERFORMANCE_WEIGHTS
  return Math.round(
    components.understanding * w.UNDERSTANDING +
      components.problemSolving * w.PROBLEM_SOLVING +
      components.codeQuality * w.CODE_QUALITY +
      components.communication * w.COMMUNICATION
  )
}

/**
 * Calculate weighted technical/mastery score from components
 * Uses weights from SCORING.TECHNICAL_WEIGHTS
 *
 * NOTE: Technical score and mastery score are the same thing.
 * Both measure objective code metrics without communication.
 */
export function calculateTechnicalScore(components: {
  correctness: number
  timeEfficiency: number
  independence: number
}): number {
  const w = SCORING.TECHNICAL_WEIGHTS
  return Math.round(
    components.correctness * w.CORRECTNESS +
      components.timeEfficiency * w.TIME_EFFICIENCY +
      components.independence * w.INDEPENDENCE
  )
}
