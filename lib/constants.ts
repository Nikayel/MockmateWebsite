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
