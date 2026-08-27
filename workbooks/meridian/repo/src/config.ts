/**
 * Nothing here is validated against a schema - a missing or malformed environment variable
 * just silently falls back to a default, and whatever reads it never finds out.
 */
export interface MeridianConfig {
  port: number
  outboxDrainIntervalMs: number
  /** Whatever NODE_ENV happens to be set to - not checked against a known list of values. */
  nodeEnv: string
}

export function loadConfig(): MeridianConfig {
  return {
    port: Number(process.env.PORT) || 3000,
    outboxDrainIntervalMs: Number(process.env.OUTBOX_DRAIN_INTERVAL_MS) || 5000,
    nodeEnv: process.env.NODE_ENV || "development",
  }
}
