/**
 * User-submitted product feedback: the contract for the `feedback` collection.
 *
 * Not to be confused with the rest of `lib/feedback/`, which scores interviews. This module owns
 * the shape of the bug reports, feature requests and general comments that users send from the
 * in-app widget and that the founder triages at /admin/feedback.
 *
 * Two trust boundaries live here:
 *
 * 1. `userFeedbackSubmissionSchema` is what a signed-in, non-admin user is allowed to send. It is
 *    `.strict()`, so triage fields (status, priority, adminNotes, votes, assignee, tags) and
 *    identity fields (userId, userEmail) are rejected outright rather than silently dropped. The
 *    server is the only writer of those; a user who tries to file their own report as
 *    `priority: "critical", status: "resolved"` gets a 400, not a poisoned queue.
 * 2. `adminFeedbackUpdateSchema` is what an admin may change. It cannot touch `content`, `userId`
 *    or `createdAt`, so the record of what the user actually wrote stays immutable.
 *
 * The `resolve*` helpers exist because Firestore documents are older than the code that reads
 * them. A document written before a value was renamed, or by a future schema, must not be able to
 * crash the admin page with `undefined.icon`.
 */

import { z } from "zod"

export const USER_FEEDBACK_TYPES = ["feedback", "feature_request", "bug_report"] as const
export type UserFeedbackType = (typeof USER_FEEDBACK_TYPES)[number]

export const FEEDBACK_STATUSES = [
  "new",
  "reviewed",
  "in_progress",
  "resolved",
  "declined",
] as const
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number]

export const FEEDBACK_PRIORITIES = ["low", "medium", "high", "critical"] as const
export type FeedbackPriority = (typeof FEEDBACK_PRIORITIES)[number]

export const FEEDBACK_CONTENT_MAX = 4000
export const FEEDBACK_PATH_MAX = 300
export const FEEDBACK_TAG_MAX = 24
export const FEEDBACK_TAGS_MAX_COUNT = 8

/**
 * Fields only the server may write. Named explicitly so the test suite can assert that every one
 * of them is refused when it arrives in a user submission, and so adding a new triage field
 * without protecting it is a visible omission rather than a silent hole.
 */
export const ADMIN_ONLY_FEEDBACK_FIELDS = [
  "status",
  "priority",
  "adminNotes",
  "votes",
  "assignee",
  "tags",
  "userId",
  "userEmail",
  "createdAt",
  "updatedAt",
  "repliedAt",
] as const

/**
 * What the in-app widget sends. Everything else about the document (who wrote it, when, what
 * status it starts in) is decided server-side from the verified token.
 */
export const userFeedbackSubmissionSchema = z
  .object({
    type: z.enum(USER_FEEDBACK_TYPES).default("feedback"),
    content: z.string().trim().min(10).max(FEEDBACK_CONTENT_MAX),
    /** The route the user was on. Useful context on a bug report, and never rendered as a link. */
    path: z.string().trim().max(FEEDBACK_PATH_MAX).optional(),
  })
  .strict()

export type UserFeedbackSubmission = z.infer<typeof userFeedbackSubmissionSchema>

/**
 * What an admin may change during triage. `content` is deliberately absent: an admin editing the
 * user's own words would make the queue untrustworthy as a record.
 */
export const adminFeedbackUpdateSchema = z
  .object({
    id: z.string().trim().min(1),
    status: z.enum(FEEDBACK_STATUSES).optional(),
    priority: z.enum(FEEDBACK_PRIORITIES).optional(),
    adminNotes: z.string().max(FEEDBACK_CONTENT_MAX).optional(),
    assignee: z.string().trim().max(120).nullable().optional(),
    tags: z
      .array(z.string().trim().min(1).max(FEEDBACK_TAG_MAX))
      .max(FEEDBACK_TAGS_MAX_COUNT)
      .optional(),
    /** Set when the admin has actually written back to the submitter. */
    markReplied: z.boolean().optional(),
  })
  .strict()

export type AdminFeedbackUpdate = z.infer<typeof adminFeedbackUpdateSchema>

/**
 * Narrow an untrusted stored value to a known feedback type.
 *
 * The admin page indexes a config record by this value. Before this existed, one document with a
 * `type` the UI did not know about (a legacy "nps" row, a typo, a value from a future release)
 * threw on `typeConfig[item.type].icon` and blanked the whole page, which reads to the founder as
 * "there is no feedback".
 */
export function resolveFeedbackType(value: unknown): UserFeedbackType {
  return isUserFeedbackType(value) ? value : "feedback"
}

export function isUserFeedbackType(value: unknown): value is UserFeedbackType {
  return typeof value === "string" && (USER_FEEDBACK_TYPES as readonly string[]).includes(value)
}

export function resolveFeedbackStatus(value: unknown): FeedbackStatus {
  return typeof value === "string" && (FEEDBACK_STATUSES as readonly string[]).includes(value)
    ? (value as FeedbackStatus)
    : "new"
}

export function resolveFeedbackPriority(value: unknown): FeedbackPriority {
  return typeof value === "string" && (FEEDBACK_PRIORITIES as readonly string[]).includes(value)
    ? (value as FeedbackPriority)
    : "medium"
}
