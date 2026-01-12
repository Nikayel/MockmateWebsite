/**
 * Code analysis utilities
 */

/**
 * Generate unique hint ID
 */
export function generateHintId(): string {
  return `hint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
