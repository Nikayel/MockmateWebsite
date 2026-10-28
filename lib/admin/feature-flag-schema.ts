import { z } from "zod"

/**
 * Identity and provenance. `key` is what application code looks a flag up by,
 * so repointing it silently rewires whatever that key gates; `createdBy` and
 * `createdAt` are the record of who introduced it. A PUT naming any of these is
 * rejected outright rather than quietly ignored, so a caller attempting mass
 * assignment gets an error instead of the false impression that it worked.
 */
const IMMUTABLE_FLAG_FIELDS = ["key", "createdBy", "createdAt", "updatedAt", "id"] as const

const flagTypeSchema = z.enum(["release", "experiment", "ops", "permission", "kill_switch"])
const flagEnvironmentSchema = z.enum(["all", "production", "staging", "development"])

/**
 * Flag keys are the join between this page and code, so the format is pinned:
 * lowercase, digits and underscores. `normalizeFlagKey()` uppercases on the
 * read side, so `My Flag` and `my_flag` would otherwise be the same switch
 * stored under two documents.
 */
const flagKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, "Key must be lowercase letters, digits and underscores")

/** Fields a caller may set. Anything outside this shape is dropped by Zod, not written. */
const mutableFlagSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).default(""),
  enabled: z.boolean().default(false),
  type: flagTypeSchema.default("release"),
  rolloutPercentage: z.number().int().min(0).max(100).default(100),
  targetTiers: z.array(z.string().trim().min(1)).max(20).default([]),
  targetUserIds: z.array(z.string().trim().min(1)).max(500).default([]),
  environment: flagEnvironmentSchema.default("all"),
  // The admin form sends "" for "no expiry" (page.tsx defaults + a cleared date input), so an empty
  // string must be accepted alongside a real datetime/date: the create/update handlers already treat
  // any falsy expiresAt as null (no expiry). Without the `z.literal("")` branch, toggling a flag that
  // has no expiry set failed with "expiresAt: Invalid datetime".
  expiresAt: z.string().datetime().or(z.string().date()).or(z.literal("")).nullable().optional(),
})

export const createFlagSchema = mutableFlagSchema.extend({ key: flagKeySchema })

/** Every mutable field optional: a PUT may carry only the one field it changes. */
export const updateFlagSchema = mutableFlagSchema.partial().extend({
  id: z.string().trim().min(1),
})

/** Reject a body that names an identity or provenance field. */
export function rejectImmutableFields(body: Record<string, unknown>): string | null {
  const offenders = IMMUTABLE_FLAG_FIELDS.filter(
    (field) => field !== "id" && Object.prototype.hasOwnProperty.call(body, field)
  )
  return offenders.length > 0
    ? `These fields cannot be changed after a flag is created: ${offenders.join(", ")}`
    : null
}
