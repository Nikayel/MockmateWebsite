import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"

export function signSuppressionJob(
  userId: string,
  revision: string,
  email: string,
  intent: string
): string | null {
  const key = process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.CRON_SECRET
  if (!key) return null
  return createHmac("sha256", key)
    .update(JSON.stringify(["email-suppression-v1", userId, revision, email, intent]))
    .digest("hex")
}
export function validSuppressionJob(
  userId: string,
  job: { revision: string; email: string; intent: string; signature?: unknown }
): boolean {
  const expected = signSuppressionJob(userId, job.revision, job.email, job.intent)
  if (!expected || typeof job.signature !== "string") return false
  const left = Buffer.from(expected),
    right = Buffer.from(job.signature)
  return left.length === right.length && timingSafeEqual(left, right)
}
